import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revokeCertificate, handleAPIError } from '@/lib/issuer-api';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
  { params }: { params: Promise<{ certificateId: string }> }
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
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
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

    const { certificateId } = await params;
    console.log('User', user.id, 'is attempting to revoke certificate', certificateId);
    // 2. 取得憑證資訊(需要 credential_id)
    const { data: certificate } = await supabase
      .from('digital_certificates')
      .select('id, credential_id, status')
      .eq('id', certificateId)
      .single();

    if (!certificate) {
      return NextResponse.json(
        { error: '找不到憑證' },
        { status: 404 }
      );
    }

    console.log('Revoking certificate:', certificate.id, 'Status:', certificate.status);

    // 檢查憑證是否已被撤銷
    if (certificate.status === 'revoked') {
      return NextResponse.json(
        { error: '憑證已被撤銷' },
        { status: 400 }
      );
    }
    console.log('herhe')
    // 3. 檢查撤銷權限
    // 取得憑證的完整資訊用於權限檢查
    const { data: certForPermission } = await supabase
      .from('digital_certificates')
      .select('booking_id, user_id, guest_type, status, shared_card_id')
      .eq('id', certificate.id)
      .single();

    if (!certForPermission) {
      return NextResponse.json(
        { error: '無法取得憑證權限資訊' },
        { status: 500 }
      );
    }

    // 檢查憑證狀態
    if (certForPermission.status === 'revoked') {
      return NextResponse.json(
        { error: '憑證已被撤銷' },
        { status: 400 }
      );
    }

    if (certForPermission.status === 'expired') {
      return NextResponse.json(
        { error: '憑證已過期' },
        { status: 400 }
      );
    }

    let canRevoke = false;
    let reason = '';

    // 1. 檢查是否為房主
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        property_id,
        properties!inner (
          host_id
        )
      `)
      .eq('id', certForPermission.booking_id)
      .single();

    if (booking) {
      const properties = booking.properties as unknown as { host_id: string };
      if (properties.host_id === user.id) {
        canRevoke = true;
        reason = '房主權限';
      }
    }

    // 2. 如果不是房主，檢查是否為主住者
    if (!canRevoke) {
      const { data: bookingForGuest } = await supabase
        .from('bookings')
        .select('guest_id')
        .eq('id', certForPermission.booking_id)
        .single();

      if (bookingForGuest && bookingForGuest.guest_id === user.id) {
        // 是主住者，檢查是否能撤銷此憑證
        if (certForPermission.guest_type === 'primary' && certForPermission.user_id === user.id) {
          // 主住者不能撤銷自己的憑證
          canRevoke = false;
          reason = '無法撤銷自己的憑證';
        } else if (certForPermission.guest_type === 'co-guest' && certForPermission.shared_card_id) {
          // 檢查是否是自己邀請的同住者
          const { data: sharedCard } = await supabase
            .from('shared_room_cards')
            .select('inviter_user_id')
            .eq('id', certForPermission.shared_card_id)
            .single();

          if (sharedCard && sharedCard.inviter_user_id === user.id) {
            canRevoke = true;
            reason = '主住者撤銷同住者';
          } else {
            canRevoke = false;
            reason = '無權限撤銷此憑證';
          }
        } else {
          canRevoke = false;
          reason = '無權限撤銷此憑證';
        }
      } else {
        canRevoke = false;
        reason = '無權限撤銷此憑證';
      }
    }

    console.log('Can user', user.id, 'revoke certificate', certificate.id, '?', canRevoke, 'Reason:', reason);

    if (!canRevoke) {
      return NextResponse.json(
        { error: `無權限撤銷: ${reason}` },
        { status: 403 }
      );
    }

    // 檢查是否有 credential_id (只有 claimed 狀態的憑證才有)
    if (!certificate.credential_id) {
      // 如果憑證還在 pending 狀態(未被掃描),直接標記為撤銷
      const { data: updatedCertificate, error: updateError } = await supabase
        .from('digital_certificates')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('id', certificate.id)
        .select()
        .single();

      if (updateError || !updatedCertificate) {
        console.error('Failed to update pending certificate status:', updateError);
        return NextResponse.json(
          { error: '更新本地憑證狀態失敗' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: '憑證已撤銷 (尚未領取)',
        reason,
        certificate: {
          id: updatedCertificate.id,
          status: updatedCertificate.status,
          revoked_at: updatedCertificate.revoked_at,
        },
      });
    }

    // 5. 呼叫政府 API 撤銷憑證 (必須成功才更新 DB)
    try {
      const result = await revokeCertificate(certificate.credential_id);
      // 確認撤銷成功
      if (result.credentialStatus !== 'REVOKED') {
        return NextResponse.json(
          { error: '政府 API 撤銷失敗：狀態不正確' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Government API revoke failed:', error);

      const apiError = handleAPIError({ ok: false, status: 500 } as Response, error);

      // 處理特定錯誤
      if (apiError.code === '61006') {
        console.error('Invalid credential ID:', certificate.credential_id);
        return NextResponse.json(
          { error: '不合法的憑證識別碼' },
          { status: 400 }
        );
      }

      // 政府 API 呼叫失敗,不更新本地 DB
      return NextResponse.json(
        { error: '政府 API 撤銷失敗,無法撤銷憑證' },
        { status: 500 }
      );
    }

    // 6. 政府 API 成功後,更新本地資料庫狀態
    const { data: updatedCertificate, error: updateError } = await supabase
      .from('digital_certificates')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
      })
      .eq('id', certificate.id)
      .select()
      .single();

    if (updateError || !updatedCertificate) {
      console.error('Failed to update certificate status:', updateError);
      return NextResponse.json(
        { error: '更新本地憑證狀態失敗' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '憑證已撤銷',
      reason,
      certificate: {
        id: updatedCertificate.id,
        status: updatedCertificate.status,
        revoked_at: updatedCertificate.revoked_at,
      },
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    return NextResponse.json(
      { error: '撤銷憑證時發生錯誤' },
      { status: 500 }
    );
  }
}
