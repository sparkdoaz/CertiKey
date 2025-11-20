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

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API: 開始創建訂單...')

    const body = await request.json()
    const {
      guest_id,
      property_id,
      check_in_date,
      check_out_date,
      guests,
      total_price,
      status = 'confirmed'
    } = body

    // 驗證必要欄位
    if (!guest_id || !property_id || !check_in_date || !check_out_date || !guests || !total_price) {
      return NextResponse.json(
        { error: '缺少必要欄位' },
        { status: 400 }
      )
    }

    // 獲取房源資訊以分配房號
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('room_numbers')
      .eq('id', property_id)
      .single()

    if (propertyError || !property) {
      console.error('❌ API: 獲取房源資訊失敗:', propertyError)
      return NextResponse.json(
        { error: '房源不存在' },
        { status: 404 }
      )
    }

    // 檢查房源是否有可用的房號
    if (!property.room_numbers || property.room_numbers.length === 0) {
      console.error('❌ API: 房源沒有可用的房號:', property_id)
      return NextResponse.json(
        { error: '房源資料不完整：缺少房號配置，請聯繫房東完善房源資訊' },
        { status: 400 }
      )
    }

    // 使用資料庫交易確保房間分配的原子性
    const { data: bookingData, error: bookingError } = await supabase.rpc('create_booking_with_room_assignment', {
      p_guest_id: guest_id,
      p_property_id: property_id,
      p_check_in_date: check_in_date,
      p_check_out_date: check_out_date,
      p_guests: guests,
      p_total_price: total_price,
      p_status: status
    })

    if (bookingError) {
      console.error('❌ API: 創建訂單失敗:', bookingError)

      // 根據錯誤訊息返回適當的 HTTP 狀態碼
      if (bookingError.message?.includes('房源資料不完整')) {
        return NextResponse.json(
          { error: '房源資料不完整：缺少房號配置，請聯繫房東完善房源資訊' },
          { status: 400 }
        )
      } else if (bookingError.message?.includes('無可用房間')) {
        return NextResponse.json(
          { error: '該時段已無可用房間，請選擇其他日期或聯繫房東' },
          { status: 409 }
        )
      } else {
        return NextResponse.json(
          { error: '創建訂單失敗', details: bookingError.message },
          { status: 500 }
        )
      }
    }

    console.log('✅ API: 訂單創建成功:', bookingData.id)

    // 轉換資料格式以符合前端 Booking 介面
    const booking = {
      // 主要欄位
      id: bookingData.id,
      guest_id: bookingData.guest_id,
      property_id: bookingData.property_id,
      check_in_date: bookingData.check_in_date,
      check_out_date: bookingData.check_out_date,
      guests: bookingData.guests,
      total_price: bookingData.total_price,
      status: bookingData.status,
      created_at: bookingData.created_at,
      updated_at: bookingData.updated_at,
      // 相容性欄位
      userId: bookingData.guest_id,
      propertyId: bookingData.property_id,
      propertyTitle: bookingData.property?.title || '未知房源',
      propertyImage: bookingData.property?.images?.[0] || bookingData.property?.image_url || '',
      checkIn: new Date(bookingData.check_in_date),
      checkOut: new Date(bookingData.check_out_date),
      totalPrice: bookingData.total_price,
      createdAt: new Date(bookingData.created_at),
      // Relations
      property: bookingData.property,
      guest: bookingData.guest,
      // 標記
      isCoGuest: false
    }

    return NextResponse.json({
      success: true,
      data: booking
    })

  } catch (error) {
    console.error('❌ API: 創建訂單伺服器錯誤:', error)
    return NextResponse.json(
      { error: '伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}