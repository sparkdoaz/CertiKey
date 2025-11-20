import { requireHost } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import type { Property } from "@/types/property"
import type { Booking } from "@/types/booking"
import { HostDashboardClient } from "./dashboard-client"

export default async function HostDashboardPage() {
  const { user } = await requireHost()
  const supabase = await createClient()

  let properties: Property[] = []
  let bookings: Booking[] = []
  let error: string | null = null

  try {
    // 查詢房東的房源
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })

    if (propertiesError) throw propertiesError
    properties = propertiesData || []

    // 查詢房東的訂單
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(*),
        guest:user_profiles!bookings_guest_id_fkey(*)
      `)
      .in('property_id', properties.map(p => p.id))
      .order('created_at', { ascending: false })

    if (bookingsError) throw bookingsError
    bookings = bookingsData || []
  } catch (err) {
    console.error('載入房東資料失敗:', err)
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