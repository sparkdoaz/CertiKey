import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { createAdminClient } from "@/utils/supabase/server"
import PaymentSuccessClient from "./payment-success-client"

interface PageProps {
  searchParams: Promise<{
    bookingId?: string
  }>
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  // 驗證用戶登入
  const { user } = await requireAuth()

  const params = await searchParams
  console.log('🔍 Payment Success 頁面開始載入，參數:', params)

  const { bookingId } = params

  if (!bookingId) {
    console.log('❌ Payment Success 頁面缺少 bookingId，重定向到房源頁面')
    redirect("/properties")
  }

  try {
    console.log('🔍 開始載入訂單資料...')

    // 使用 admin client 繞過 RLS
    const supabase = await createAdminClient()

    // 先嘗試查詢，如果失敗則重試一次
    let booking = null
    let attempts = 0
    const maxAttempts = 3

    while (!booking && attempts < maxAttempts) {
      attempts++
      console.log(`🔄 查詢訂單嘗試 ${attempts}/${maxAttempts}...`)

      const { data, error } = await supabase
        .from('bookings')
        .select('*, property:properties(*), guest:user_profiles(*)')
        .eq('id', bookingId)
        .single()

      if (!error && data) {
        booking = data
        console.log('✅ 成功找到訂單:', data.id)
      } else {
        console.log(`❌ 查詢失敗 (嘗試 ${attempts}):`, error)
        if (attempts < maxAttempts) {
          // 等待 1 秒後重試
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    if (!booking) {
      console.log('❌ 訂單不存在或查詢失敗，重定向到房源頁面')
      redirect("/properties")
    }

    // 驗證訂單屬於當前用戶
    if (booking.guest_id !== user.id) {
      console.log('❌ 訂單不屬於當前用戶，重定向')
      redirect("/properties")
    }

    console.log('✅ 成功載入訂單資料:', booking.id)

    return <PaymentSuccessClient booking={booking} />
  } catch (error) {
    console.error('❌ Payment Success 頁面載入訂單失敗:', error)
    redirect("/properties")
  }
}