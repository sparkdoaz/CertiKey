import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('bookingId')

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId parameter' }, { status: 400 })
  }

  try {
    const client = await createAdminClient()

    const { data, error } = await client
      .from('door_access_logs')
      .select(`
        id,
        booking_id,
        user_id,
        access_time,
        access_method,
        status,
        transaction_id,
        created_at,
        user:user_profiles(id, name),
        booking:bookings(
          id,
          property:properties(id, title)
        )
      `)
      .eq('booking_id', bookingId)
      .order('access_time', { ascending: false })

    if (error) {
      console.error('Door access logs query error:', error)
      return NextResponse.json({ error: 'Failed to fetch door access logs' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Door access logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}