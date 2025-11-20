import { requireAuth } from "@/lib/auth"
import type { Booking } from "@/types/booking"
import { BookingsClient } from "./bookings-client"

export default async function BookingsPage() {
  const { user, supabase } = await requireAuth()

  console.log('🔍 SSR: 開始載入用戶訂單資料...', user.id)

  // 直接從 Server Component 查詢資料
  const { data, error } = await supabase
    .from('bookings')
    .select('*, property:properties(*), guest:user_profiles(*)')
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ SSR: 查詢訂單失敗:', error)
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-bold">我的訂單</h1>
          <div className="text-center py-12">
            <p className="text-destructive">載入訂單時發生錯誤</p>
            <p className="text-muted-foreground mt-2">請重新整理頁面或稍後再試</p>
          </div>
        </div>
      </div>
    )
  }

  console.log(`✅ SSR: 成功載入 ${data?.length || 0} 筆訂單`)

  // 轉換資料格式
  const bookings: Booking[] = data?.map(booking => ({
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
    room_number: booking.room_number,
    propertyTitle: booking.property?.title || '未知物業',
    propertyImage: booking.property?.images?.[0] || '/placeholder.jpg',
    guestName: booking.guest?.name || '未知房客',
    guestEmail: booking.guest?.email || '',
    // 相容性欄位（前端顯示用）
    checkIn: new Date(booking.check_in_date),
    checkOut: new Date(booking.check_out_date),
    totalPrice: booking.total_price,
    createdAt: new Date(booking.created_at),
    // Relations
    property: booking.property,
    guest: booking.guest,
  })) || []

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">我的訂單</h1>
        <BookingsClient initialBookings={bookings} />
      </div>
    </div>
  )
}