import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VCStatusResponse, ParsedJWTPayload } from '@/types/digital-certificate-record';
import { getCertificateStatus, handleAPIError, VCStatusResult } from '@/lib/digital-certificate-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 解析 JWT Token
 */
function parseJWT(jwt: string): ParsedJWTPayload | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * 從 JWT jti 提取 Credential ID
 */
function extractCredentialId(jti: string): string | null {
  try {
    const match = jti.match(/\/credential\/([a-f0-9-]+)$/i);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Failed to extract credential ID:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
): Promise<NextResponse> {
  try {
    console.log('🔍 VC Status API called, parsing params...');
    const paramsData = await params;
    console.log('📊 Params parsed:', paramsData);
    const { transactionId } = paramsData;
    console.log('🔍 VC Status API called with transactionId:', transactionId);

    if (!transactionId) {
      console.log('❌ Missing transactionId parameter');
      return NextResponse.json(
        { error: 'MISSING_TRANSACTION_ID', message: '缺少 transactionId 參數' },
        { status: 400 }
      );
    }

    // 驗證用戶身份
    const authHeader = request.headers.get('authorization');
    console.log('🔐 Auth header check:', {
      present: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer '),
      length: authHeader?.length
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid auth header format');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '未授權：缺少認證憑證' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token extracted, length:', token.length, 'starts with:', token.substring(0, 20) + '...');
    
    // 使用 service role key 建立 Supabase 客戶端來驗證 token
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 驗證 JWT token
    console.log('🔐 Verifying JWT token with Supabase...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log('📊 Auth result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      error: authError,
      hasUser: !!user,
      hasError: !!authError
    });
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '認證失敗' },
        { status: 401 }
      );
    }

    console.log('✅ Authentication successful for user:', user.id);

    // 從資料庫查詢憑證記錄
    console.log('🔍 Querying database for transaction_id:', transactionId);
    const { data: certificate, error: dbError } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    console.log('📊 Database query result:', { 
      found: !!certificate, 
      error: dbError,
      certificate: certificate ? {
        id: certificate.id,
        user_id: certificate.user_id,
        status: certificate.status,
        transaction_id: certificate.transaction_id
      } : null
    });

    if (dbError || !certificate) {
      console.log('❌ Certificate not found in database:', { dbError, hasCertificate: !!certificate });
      return NextResponse.json(
        { error: 'CERTIFICATE_NOT_FOUND', message: '找不到憑證記錄' },
        { status: 404 }
      );
    }

    // 驗證權限：確保是用戶自己的憑證
    console.log('🔐 Checking permissions:', { 
      certificate_user_id: certificate.user_id, 
      request_user_id: user.id,
      match: certificate.user_id === user.id 
    });
    if (certificate.user_id !== user.id) {
      console.log('❌ Permission denied: user does not own this certificate');
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '無權存取此憑證' },
        { status: 403 }
      );
    }

    // 額外安全檢查：驗證 token 沒有過期
    // 注意：Supabase User 對象不包含 exp 屬性，這裡我們信任 Supabase 的內建驗證
    // 如果需要手動驗證 token 過期，可以解析原始 JWT token

    // 呼叫外部 API 查詢 VC 狀態
    console.log('Querying VC status for transaction:', transactionId);

    const vcStatusResult: VCStatusResult = await getCertificateStatus(transactionId);
    
    // 檢查是否為錯誤響應
    if ('error' in vcStatusResult) {
      // 這是特殊的錯誤響應（例如憑證尚未被領取）
      if (vcStatusResult.code === '61010') {
        return NextResponse.json({
          transaction_id: transactionId,
          status: 'pending',
          message: vcStatusResult.message || 'QR Code 尚未被掃描',
          certificate_status: certificate.status,
          created_at: certificate.created_at,
        }, { status: 200 }); // 這不是錯誤,是正常的待掃描狀態
      }
      
      // 其他錯誤
      return NextResponse.json(
        {
          error: vcStatusResult.error,
          message: vcStatusResult.message,
          code: vcStatusResult.code,
        },
        { status: 400 }
      );
    }

    // 正常的成功響應
    const vcStatus = vcStatusResult;

    // 解析 JWT Token
    const parsedPayload = parseJWT(vcStatus.credential);
    let credentialId: string | null = null;
    let expiresAt: string | null = null;

    if (parsedPayload) {
      // 提取 Credential ID
      if (parsedPayload.jti) {
        credentialId = extractCredentialId(parsedPayload.jti);
      }

      // 提取到期時間
      if (parsedPayload.exp) {
        expiresAt = new Date(parsedPayload.exp * 1000).toISOString();
      }

      // 更新資料庫記錄: 狀態改為 claimed (已被掃描)
      // 註: 不儲存 credential_jwt,只需解析一次取得必要欄位即可
      const updateData: any = {
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      };

      if (credentialId) {
        updateData.credential_id = credentialId;
      }

      if (expiresAt) {
        updateData.expires_at = expiresAt;
        
        // 檢查是否已過期
        if (new Date(expiresAt) < new Date()) {
          updateData.status = 'expired';
        }
      }

      await supabase
        .from('digital_certificates')
        .update(updateData)
        .eq('id', certificate.id);
    }

    // 回傳結果
    return NextResponse.json({
      transaction_id: transactionId,
      credential_id: credentialId,
      status: certificate.status,
      created_at: certificate.created_at,
      expires_at: expiresAt,
      vc_status: vcStatus,
      parsed_payload: parsedPayload,
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in VC status API:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: '伺服器內部錯誤' },
      { status: 500 }
    );
  }
}
