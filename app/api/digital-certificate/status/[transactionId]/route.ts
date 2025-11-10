import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VCStatusResponse, ParsedJWTPayload } from '@/types/digital-certificate-record';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// VC 狀態查詢 API URL
const VC_STATUS_API_URL = 'https://issuer-sandbox.wallet.gov.tw/api/credential/nonce';

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
  { params }: { params: { transactionId: string } }
): Promise<NextResponse> {
  try {
    const { transactionId } = params;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'MISSING_TRANSACTION_ID', message: '缺少 transactionId 參數' },
        { status: 400 }
      );
    }

    // 驗證用戶身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '未授權：缺少認證憑證' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '認證失敗' },
        { status: 401 }
      );
    }

    // 從資料庫查詢憑證記錄
    const { data: certificate, error: dbError } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (dbError || !certificate) {
      return NextResponse.json(
        { error: 'CERTIFICATE_NOT_FOUND', message: '找不到憑證記錄' },
        { status: 404 }
      );
    }

    // 驗證權限：確保是用戶自己的憑證
    if (certificate.user_id !== user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '無權存取此憑證' },
        { status: 403 }
      );
    }

    // 呼叫外部 API 查詢 VC 狀態
    const vcStatusUrl = `${VC_STATUS_API_URL}/${transactionId}`;
    console.log('Querying VC status:', vcStatusUrl);

    const response = await fetch(vcStatusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 處理 API 回應
    if (!response.ok) {
      const errorData = await response.json();
      console.log('VC status API error response:', {
        status: response.status,
        data: errorData
      });

      // 處理 400: QR Code 尚未被掃描 (code: "61010")
      if (response.status === 400 && errorData.code === '61010') {
        return NextResponse.json({
          transaction_id: transactionId,
          status: 'pending',
          message: errorData.message || 'QR Code 尚未被掃描',
          certificate_status: certificate.status,
          created_at: certificate.created_at,
        }, { status: 200 }); // 這不是錯誤,是正常的待掃描狀態
      }

      // 處理 500: 伺服器端錯誤 (code: "500")
      if (response.status === 500 && errorData.code === '500') {
        return NextResponse.json(
          {
            error: 'VC_API_SERVER_ERROR',
            message: errorData.message || '政府 VC API 伺服器錯誤',
            code: errorData.code,
          },
          { status: 500 }
        );
      }

      // 其他未預期的錯誤
      return NextResponse.json(
        {
          error: 'VC_STATUS_API_ERROR',
          message: '查詢 VC 狀態失敗',
          details: { status: response.status, body: errorData }
        },
        { status: response.status }
      );
    }

    const vcStatus: VCStatusResponse = await response.json();

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
