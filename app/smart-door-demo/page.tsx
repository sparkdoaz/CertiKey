import { Suspense } from "react"
import { SmartDoorDemoClient } from "./client"
import { createAdminClient } from "@/utils/supabase/server"
import type { Booking } from "@/types/booking"

interface PropertyInfo {
  id: string
  title: string
  vc_title?: string
}

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function SmartDoorDemoPage({ searchParams }: PageProps) {
  const params = await searchParams
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null

  const supabase = await createAdminClient()

  let booking: Booking | null = null
  let property: PropertyInfo | null = null
  let error: string | null = null

  if (bookingId) {
    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single()

      if (bookingError) throw bookingError
      booking = bookingData

      // 如果有 booking，獲取對應的 property 信息
      if (booking?.property_id) {
        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("id, title, vc_title")
          .eq("id", booking.property_id)
          .single()

        if (propertyError) {
          console.error("Error fetching property:", propertyError)
          // 不拋出錯誤，因為 booking 數據是主要的
        } else {
          property = propertyData
        }
      }
    } catch (err) {
      error = "無法獲取訂單信息"
      console.error("Error fetching booking:", err)
    }
  } else {
    error = "未提供訂單編號"
  }

  return (
    <Suspense fallback={<div>載入中...</div>}>
      <SmartDoorDemoClient initialBooking={booking} initialProperty={property} initialError={error} />
    </Suspense>
  )
}
