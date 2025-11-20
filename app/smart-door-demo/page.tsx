import { Suspense } from "react"
import { SmartDoorDemoClient } from "./client"
import { createAdminClient } from "@/utils/supabase/server"
import type { Booking } from "@/types/booking"
import { redirect, RedirectType } from "next/navigation"

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
  const propertyId = typeof params.propertyId === 'string' ? params.propertyId : null
  const room = typeof params.room === 'string' ? params.room : null
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null

  // 如果有 bookingId，則重定向到新的格式
  if (bookingId && !propertyId && !room) {
    const supabase = await createAdminClient()
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("property_id, room_number")
      .eq("id", bookingId)
      .single()

    if (!bookingError && bookingData) {
      const newUrl = `/smart-door-demo?propertyId=${bookingData.property_id}&room=${bookingData.room_number || 'R001'}`
      console.log("Redirecting to:", newUrl)
      redirect(newUrl, RedirectType.replace)
    }
    // 如果查詢失敗，繼續顯示錯誤
  }

  const supabase = await createAdminClient()

  let property: PropertyInfo | null = null
  let error: string | null = null

  if (propertyId) {
    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id, title, vc_title")
        .eq("id", propertyId)
        .single()

      if (propertyError) throw propertyError
      property = propertyData
    } catch (err) {
      error = "無法獲取房源信息"
      console.error("Error fetching property:", err)
    }
  } else {
    error = "未提供房源編號"
  }

  return (
    <Suspense fallback={<div>載入中...</div>}>
      <SmartDoorDemoClient initialProperty={property} initialRoom={room} initialError={error} />
    </Suspense>
  )
}
