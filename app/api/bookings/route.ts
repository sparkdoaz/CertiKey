import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用 service role key 來繞過 RLS 限制
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: 開始載入訂單資料...')

    // 從查詢參數獲取用戶 ID（如果需要按用戶過濾）
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabase
      .from('bookings')
      .select('*, property:properties(*), guest:user_profiles(*)')
      .order('created_at', { ascending: false })

    // 如果有用戶 ID，則只查詢該用戶的訂單
    if (userId) {
      query = query.eq('guest_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ API: 查詢訂單失敗:', error)
      return NextResponse.json(
        { error: '查詢訂單失敗', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ API: 成功載入 ${data?.length || 0} 筆訂單`)

    // 轉換資料格式以符合前端 Booking 介面
    const bookings = data?.map(booking => ({
      // 主要欄位
      id: booking.id,
      guest_id: booking.guest_id,
      property_id: booking.property_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      guests: booking.guests,
      total_price: booking.total_price,
      status: booking.status,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      // 相容性欄位
      userId: booking.guest_id,
      propertyId: booking.property_id,
      propertyTitle: booking.property?.title || '未知房源',
      propertyImage: booking.property?.images?.[0] || booking.property?.image_url || '',
      checkIn: new Date(booking.check_in_date),
      checkOut: new Date(booking.check_out_date),
      totalPrice: booking.total_price,
      createdAt: new Date(booking.created_at),
      // Relations
      property: booking.property,
      guest: booking.guest,
      // 標記
      isCoGuest: false
    })) || []

    return NextResponse.json({
      success: true,
      data: bookings,
      count: bookings.length
    })

  } catch (error) {
    console.error('❌ API: 伺服器錯誤:', error)
    return NextResponse.json(
      { error: '伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}