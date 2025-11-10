import { redirect } from "next/navigation"
import { getProperties, getHostBookings } from "@/lib/supabase-queries"
import type { Property } from "@/types/property"
import type { Booking } from "@/types/booking"
import { HostDashboardClient } from "./dashboard-client"

export default async function HostDashboardPage() {
  // Note: This will need authentication in the real app
  // For now, we'll show a basic structure
  let properties: Property[] = []
  let bookings: Booking[] = []
  let error: string | null = null

  try {
    console.log('🔍 開始載入房東資料...')
    
    // In a real app, you would get the current user from authentication
    // and filter properties and bookings by host ID
    const allProperties = await getProperties()
    // const hostProperties = allProperties?.filter(p => p.host_id === user.id) || []
    properties = allProperties || []
    
    // const hostBookings = await getHostBookings(user.id)
    // bookings = hostBookings || []
    
    console.log(`✅ 成功載入 ${properties.length} 個房源，${bookings.length} 個訂單`)
  } catch (err) {
    console.error('❌ 載入房東資料失敗:', err)
    error = err instanceof Error ? err.message : '載入房東資料失敗'
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">房東儀表板</h1>
          <p className="text-muted-foreground">管理您的房源和訂單</p>
        </div>

        <HostDashboardClient 
          initialProperties={properties} 
          initialBookings={bookings} 
          error={error} 
        />
      </div>
    </div>
  )
}