import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  canUserRevokeCertificate,
  markCertificateAsRevoked,
} from '@/lib/digital-certificate-queries';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 政府 VC API 配置
const VC_API_URL = process.env.DIGITAL_CERTIFICATE_API_URL || 'https://issuer-sandbox.wallet.gov.tw/api';
const ACCESS_TOKEN = process.env.DIGITAL_CERTIFICATE_ACCESS_TOKEN!;

/**
 * POST /api/digital-certificate/revoke-by-nonce
 * 透過 nonce 撤銷數位憑證
 * 
 * Request Body:
 * {
 *   bookingId: string,  // 訂單 ID
 *   nonce: string       // 憑證的 nonce (4 字元)
 * }
 * 
 * 權限規則:
 * 1. 房主可以撤銷該物業所有訂單的房卡
 * 2. 主住者可以撤銷自己邀請的同住者的房卡
 * 3. 主住者不能撤銷自己的房卡
 * 4. 同住者不能撤銷任何房卡
 */
export async function POST(request: NextRequest) {
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

    // 2. 解析請求內容
    let body: { bookingId: string; nonce: string };
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: '請求格式錯誤，請提供有效的 JSON 格式' },
        { status: 400 }
      );
    }

    // 驗證必要欄位
    if (!body.bookingId || !body.nonce) {
      return NextResponse.json(
        { error: '缺少必要欄位：bookingId 和 nonce' },
        { status: 400 }
      );
    }

    // 3. 透過 booking_id + nonce 查詢憑證
    const { data: certificate, error: certError } = await supabase
      .from('digital_certificates')
      .select('id, credential_id, status, user_id, guest_type, nonce')
      .eq('booking_id', body.bookingId)
      .eq('nonce', body.nonce)
      .single();

    if (certError || !certificate) {
      console.error('Certificate not found:', { bookingId: body.bookingId, nonce: body.nonce });
      return NextResponse.json(
        { error: '找不到對應的憑證記錄' },
        { status: 404 }
      );
    }

    const certificateId = certificate.id;

    // 4. 檢查憑證是否已被撤銷
    if (certificate.status === 'revoked') {
      return NextResponse.json(
        { error: '此憑證已被撤銷' },
        { status: 400 }
      );
    }

    // 5. 檢查撤銷權限
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

    // 6. 如果憑證還在 pending 狀態(未被掃描),直接在本地撤銷
    if (certificate.status === 'pending' || !certificate.credential_id) {
      await markCertificateAsRevoked(certificateId);

      return NextResponse.json({
        success: true,
        message: '憑證撤銷成功 (QR Code 尚未被掃描)',
        reason,
        certificate: {
          id: certificateId,
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          credential_id: null,
          nonce: certificate.nonce,
        },
      });
    }

    // 7. 憑證已被掃描,需要呼叫政府 API 撤銷
    const credential_id = certificate.credential_id;

    try {
      const revokeUrl = `${VC_API_URL}/credential/${credential_id}/revocation`;
      console.log('Calling government revoke API:', revokeUrl);

      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': ACCESS_TOKEN,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Government API revoke failed:', {
          status: response.status,
          data: errorData,
        });

        // 處理特定錯誤碼
        if (errorData.code === '61006') {
          // 不合法的憑證識別碼
          console.warn('Invalid credential ID, marking as revoked locally');
          await markCertificateAsRevoked(certificateId);

          return NextResponse.json({
            success: true,
            message: '憑證撤銷成功',
            reason,
            warning: '政府 API 回報憑證識別碼不合法,已在本地標記為撤銷',
            certificate: {
              id: certificateId,
              status: 'revoked',
              revoked_at: new Date().toISOString(),
              credential_id,
              nonce: certificate.nonce,
            },
          });
        }

        // 其他 API 錯誤,仍然在本地標記為撤銷(降級處理)
        await markCertificateAsRevoked(certificateId);

        return NextResponse.json({
          success: true,
          message: '憑證撤銷成功',
          reason,
          warning: `政府 API 撤銷失敗(${errorData.message || '未知錯誤'}),但已在本地標記為撤銷`,
          certificate: {
            id: certificateId,
            status: 'revoked',
            revoked_at: new Date().toISOString(),
            credential_id,
            nonce: certificate.nonce,
          },
        });
      }

      // 成功撤銷
      const result = await response.json();
      console.log('Government API revoke successful:', result);

      // 更新本地資料庫
      await markCertificateAsRevoked(certificateId);

      return NextResponse.json({
        success: true,
        message: '憑證撤銷成功',
        reason,
        credentialStatus: result.credentialStatus,
        certificate: {
          id: certificateId,
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          credential_id,
          nonce: certificate.nonce,
        },
      });
    } catch (apiError) {
      console.error('Unexpected error calling government API:', apiError);

      // API 呼叫失敗,但仍然在本地標記為撤銷
      await markCertificateAsRevoked(certificateId);

      return NextResponse.json({
        success: true,
        message: '憑證撤銷成功',
        reason,
        warning: '政府 API 無法連線,但已在本地標記為撤銷',
        certificate: {
          id: certificateId,
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          credential_id,
          nonce: certificate.nonce,
        },
      });
    }
  } catch (error) {
    console.error('Unexpected error in revoke-by-nonce API:', error);
    return NextResponse.json(
      { error: '伺服器內部錯誤' },
      { status: 500 }
    );
  }
}

// 只允許 POST 方法
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: '此端點僅支援 POST 請求' },
    { status: 405 }
  );
}
