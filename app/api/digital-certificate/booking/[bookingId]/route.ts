import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/digital-certificate/booking/[bookingId]
 * 查詢訂單的所有數位憑證(主住者 + 所有同住者)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
): Promise<NextResponse> {
  try {
    const { bookingId } = await params;

    // 從請求 header 獲取 Authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '未授權：缺少有效的認證憑證' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // 建立 Supabase 客戶端
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
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '認證失敗：無效的認證憑證' },
        { status: 401 }
      );
    }

    // 查詢訂單資訊(包含物業的房主)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id, 
        guest_id,
        property_id,
        properties!inner (
          host_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'BOOKING_NOT_FOUND', message: '找不到訂單資料' },
        { status: 404 }
      );
    }

    // 判斷用戶角色
    const properties = booking.properties as unknown as { host_id: string };
    const isHost = properties.host_id === user.id;
    const isPrimaryGuest = booking.guest_id === user.id;
    
    let isCoGuest = false;

    // 如果不是房主也不是主住者,檢查是否為同住者
    if (!isHost && !isPrimaryGuest) {
      const { data: sharedCards, error: sharedCardError } = await supabase
        .from('shared_room_cards')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('invitee_id', user.id)
        .eq('status', 'accepted');

      isCoGuest = !sharedCardError && sharedCards && sharedCards.length > 0;

      if (!isCoGuest) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: '您無權查看此訂單的憑證' },
          { status: 403 }
        );
      }
    }

    // 查詢所有憑證
    const { data: certificates, error: certsError } = await supabase
      .from('digital_certificates')
      .select(`
        *,
        user:user_profiles!digital_certificates_user_id_fkey(id, name, email),
        shared_card:shared_room_cards(id, status, inviter_id, invitee_id)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (certsError) {
      console.error('Failed to fetch certificates:', certsError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '查詢憑證失敗' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookingId,
      certificates: certificates || [],
      userRole: isHost ? 'host' : isPrimaryGuest ? 'primary_guest' : 'co_guest',
      permissions: {
        canRevokeAll: isHost, // 房主可以撤銷所有憑證
        canRevokeCo: isPrimaryGuest, // 主住者可以撤銷同住者的憑證
        canRevokeOwn: false, // 沒有人可以撤銷自己的憑證
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: '伺服器內部錯誤' },
      { status: 500 }
    );
  }
}
