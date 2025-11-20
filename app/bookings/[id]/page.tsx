import { redirect, notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { BookingDetailClient } from "./booking-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { user, supabase } = await requireAuth()
  const { id } = await params

  // 查詢訂單資料
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      *,
      property:properties(*),
      guest:user_profiles(*)
    `)
    .eq('id', id)
    .maybeSingle()

  if (bookingError || !booking) {
    redirect('/bookings')
  }

  // 檢查是否為主住者
  const isPrimaryGuest = booking.guest_id === user.id

  // 如果不是主住者,檢查是否為同住者
  if (!isPrimaryGuest) {
    const { data: sharedCard } = await supabase
      .from('shared_room_cards')
      .select('*')
      .eq('booking_id', id)
      .eq('invitee_email', user.email)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!sharedCard) {
      redirect('/bookings')
    }
  }

  // 確保返回的對象是可序列化的，並添加相容性欄位
  const serializableBooking = JSON.parse(JSON.stringify({
    ...booking,
    // 相容性欄位
    checkIn: booking.check_in_date,
    checkOut: booking.check_out_date,
    propertyTitle: booking.property?.title || '',
    propertyImage: booking.property?.images?.[0] || booking.property?.image_url || '',
    guestName: booking.guest?.name,
    guestEmail: booking.guest?.email,
  }))

  return (
    <BookingDetailClient
      booking={serializableBooking}
      userId={user.id}
      userEmail={user.email!}
      isPrimaryGuest={isPrimaryGuest}
    />
  )
}
