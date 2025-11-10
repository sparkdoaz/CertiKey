import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  canUserRevokeCertificate,
  markCertificateAsRevoked,
} from '@/lib/digital-certificate-queries';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/digital-certificate/revoke/[certificateId]
 * 撤銷數位憑證
 * 
 * 權限規則:
 * 1. 房主可以撤銷該物業所有訂單的房卡
 * 2. 主住者可以撤銷自己邀請的同住者的房卡
 * 3. 主住者不能撤銷自己的房卡
 * 4. 同住者不能撤銷任何房卡
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { certificateId: string } }
) {
  try {
    // 1. 驗證用戶身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '缺少 Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // 使用用戶的 token 建立 Supabase 客戶端
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // 驗證用戶身份
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json(
        { error: '認證失敗：無效的認證憑證' },
        { status: 401 }
      );
    }

    const certificateId = params.certificateId;

    // 2. 檢查撤銷權限
    const { canRevoke, reason } = await canUserRevokeCertificate(
      user.id,
      certificateId
    );

    if (!canRevoke) {
      return NextResponse.json(
        { error: `無權限撤銷: ${reason}` },
        { status: 403 }
      );
    }

    // 3. 取得憑證資訊(需要 credential_id)
    const { data: certificate } = await supabase
      .from('digital_certificates')
      .select('credential_id, credential_jwt, status')
      .eq('id', certificateId)
      .single();

    if (!certificate) {
      return NextResponse.json(
        { error: '找不到憑證' },
        { status: 404 }
      );
    }

    // 檢查憑證是否已被撤銷
    if (certificate.status === 'revoked') {
      return NextResponse.json(
        { error: '憑證已被撤銷' },
        { status: 400 }
      );
    }

    // 檢查是否有 credential_id (只有 claimed 狀態的憑證才有)
    if (!certificate.credential_id) {
      // 如果憑證還在 pending 狀態(未被掃描),直接標記為撤銷
      const updatedCertificate = await markCertificateAsRevoked(certificateId);
      
      return NextResponse.json({
        success: true,
        message: '憑證已撤銷 (尚未領取)',
        reason,
        certificate: {
          id: updatedCertificate!.id,
          status: updatedCertificate!.status,
          revoked_at: updatedCertificate!.revoked_at,
        },
      });
    }

    // 4. 呼叫政府 API 撤銷憑證
    try {
      const apiUrl = process.env.DIGITAL_CERTIFICATE_API_URL || 'https://issuer-sandbox.wallet.gov.tw/api';
      const accessToken = process.env.DIGITAL_CERTIFICATE_ACCESS_TOKEN;

      if (!accessToken) {
        console.error('Missing DIGITAL_CERTIFICATE_ACCESS_TOKEN');
        return NextResponse.json(
          { error: '伺服器配置錯誤' },
          { status: 500 }
        );
      }

      const revokeResponse = await fetch(`${apiUrl}/credential/${certificate.credential_id}/revocation`, {
        method: 'POST',
        headers: {
          'Access-Token': accessToken,
        },
      });

      if (!revokeResponse.ok) {
        const errorData = await revokeResponse.json().catch(() => ({}));
        
        // 處理特定錯誤
        if (errorData.code === '61006') {
          console.error('Invalid credential ID:', certificate.credential_id);
          return NextResponse.json(
            { error: '不合法的憑證識別碼' },
            { status: 400 }
          );
        }

        console.error('Government API revoke failed:', errorData);
        return NextResponse.json(
          { error: `政府 API 撤銷失敗: ${errorData.message || '未知錯誤'}` },
          { status: revokeResponse.status }
        );
      }

      const revokeData = await revokeResponse.json();
      console.log('Government API revoke response:', revokeData);

      // 5. 更新本地資料庫狀態
      const updatedCertificate = await markCertificateAsRevoked(certificateId);

      if (!updatedCertificate) {
        return NextResponse.json(
          { error: '更新本地憑證狀態失敗' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '憑證已撤銷',
        reason,
        credentialStatus: revokeData.credentialStatus,
        certificate: {
          id: updatedCertificate.id,
          status: updatedCertificate.status,
          revoked_at: updatedCertificate.revoked_at,
          credential_id: updatedCertificate.credential_id,
        },
      });
    } catch (apiError) {
      console.error('Error calling government revoke API:', apiError);
      
      // API 呼叫失敗,仍然更新本地狀態
      const updatedCertificate = await markCertificateAsRevoked(certificateId);
      
      return NextResponse.json({
        success: true,
        message: '憑證已在本地撤銷 (政府 API 呼叫失敗)',
        reason,
        warning: '無法同步至政府系統,請稍後重試',
        certificate: {
          id: updatedCertificate!.id,
          status: updatedCertificate!.status,
          revoked_at: updatedCertificate!.revoked_at,
        },
      });
    }
  } catch (error) {
    console.error('Error revoking certificate:', error);
    return NextResponse.json(
      { error: '撤銷憑證時發生錯誤' },
      { status: 500 }
    );
  }
}
