import { redirect } from "next/navigation"
import { getBooking } from "@/lib/supabase-queries"
import PaymentSuccessClient from "./payment-success-client"

interface PageProps {
  searchParams: {
    bookingId?: string
  }
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  console.log('🔍 Payment Success 頁面開始載入，參數:', searchParams)

  const { bookingId } = searchParams

  if (!bookingId) {
    console.log('❌ Payment Success 頁面缺少 bookingId，重定向到房源頁面')
    redirect("/properties")
  }

  try {
    console.log('🔍 開始載入訂單資料...')
    const booking = await getBooking(bookingId)

    if (!booking) {
      console.log('❌ 訂單不存在，重定向到房源頁面')
      redirect("/properties")
    }

    console.log('✅ 成功載入訂單資料:', booking.id)

    return <PaymentSuccessClient booking={booking} />
  } catch (error) {
    console.error('❌ Payment Success 頁面載入訂單失敗:', error)
    redirect("/properties")
  }
}