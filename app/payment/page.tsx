import { redirect } from "next/navigation"
import { getProperty } from "@/lib/supabase-queries"
import PaymentClient from "./payment-client"

interface PageProps {
  searchParams: {
    propertyId?: string
    checkIn?: string
    checkOut?: string
    guests?: string
    totalPrice?: string
  }
}

export default async function PaymentPage({ searchParams }: PageProps) {
  console.log('🔍 Payment 頁面開始載入，參數:', searchParams)

  const { propertyId, checkIn, checkOut, guests, totalPrice } = searchParams

  // 驗證必要參數
  if (!propertyId || !checkIn || !checkOut || !guests || !totalPrice) {
    console.log('❌ Payment 頁面參數不完整，重定向到房源頁面')
    redirect("/properties")
  }

  try {
    console.log('🔍 開始載入房源資料...')
    const property = await getProperty(propertyId)

    if (!property) {
      console.log('❌ 房源不存在，重定向到房源頁面')
      redirect("/properties")
    }

    console.log('✅ 成功載入房源資料:', property.title)

    // 建立預訂資料
    const bookingData = {
      propertyId: propertyId,
      propertyTitle: property.title,
      propertyImage: property.images?.[0] || property.image_url,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: parseInt(guests),
      totalPrice: parseFloat(totalPrice),
    }

    return <PaymentClient bookingData={bookingData} />
  } catch (error) {
    console.error('❌ Payment 頁面載入房源失敗:', error)
    redirect("/properties")
  }
}