/**
 * 房間管理相關查詢函數
 */

import { supabase } from '@/lib/supabase'

export interface RoomAvailability {
  roomNumber: string
  isAvailable: boolean
  currentBooking?: {
    id: string
    guestName: string
    checkIn: string
    checkOut: string
  }
}

interface BookingWithGuest {
  id: string
  room_number: string | null
  check_in_date: string
  check_out_date: string
  status: string
  guest: Array<{ name: string | null }>
}

interface PropertyWithBookings {
  id: string
  title: string
  room_numbers: unknown
  bookings: Array<{
    id: string
    room_number: string | null
    check_in_date: string
    check_out_date: string
    status: string
    guest: Array<{ name: string | null; email: string }>
  }>
}

interface BookingWithProperty {
  id: string
  room_number: string | null
  check_in_date: string
  check_out_date: string
  guests: number
  status: string
  property: Array<{
    id: string
    title: string
    address: string
    city: string
  }>
}

/**
 * 查詢房源在特定期間的房間可用性
 */
export async function getPropertyRoomAvailability(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<RoomAvailability[]> {
  // 1. 獲取房源的所有房間號碼
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('room_numbers')
    .eq('id', propertyId)
    .single()

  if (propertyError) throw propertyError

  const allRooms = (property?.room_numbers as string[]) || []

  // 2. 查詢該期間內的所有預訂
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      room_number,
      check_in_date,
      check_out_date,
      status,
      guest:user_profiles!guest_id(name)
    `)
    .eq('property_id', propertyId)
    .in('status', ['confirmed', 'pending'])
    .or(`check_in_date.lte.${endDate},check_out_date.gte.${startDate}`)

  if (bookingsError) throw bookingsError

  // 3. 建立房間可用性映射
  const occupiedRooms = new Map<string, any>()
  bookings?.forEach((booking: BookingWithGuest) => {
    if (booking.room_number) {
      occupiedRooms.set(booking.room_number, {
        id: booking.id,
        guestName: booking.guest?.[0]?.name || '訪客',
        checkIn: booking.check_in_date,
        checkOut: booking.check_out_date,
      })
    }
  })

  // 4. 組合結果
  return allRooms.map(roomNumber => ({
    roomNumber,
    isAvailable: !occupiedRooms.has(roomNumber),
    currentBooking: occupiedRooms.get(roomNumber),
  }))
}

/**
 * 查詢房東所有房源的房間使用狀況
 */
export async function getHostPropertiesRoomStatus(hostId: string) {
  const { data: properties, error } = await supabase
    .from('properties')
    .select(`
      id,
      title,
      room_numbers,
      bookings!inner(
        id,
        room_number,
        check_in_date,
        check_out_date,
        status,
        guest:user_profiles!guest_id(name, email)
      )
    `)
    .eq('host_id', hostId)

  if (error) throw error

  return properties?.map((property: PropertyWithBookings) => {
    const allRooms = (property.room_numbers as string[]) || []
    const activeBookings = property.bookings.filter(
      b => b.status === 'confirmed' || b.status === 'pending'
    )

    return {
      propertyId: property.id,
      propertyTitle: property.title,
      totalRooms: allRooms.length,
      occupiedRooms: activeBookings.length,
      availableRooms: allRooms.length - activeBookings.length,
      rooms: allRooms.map(roomNumber => {
        const booking = activeBookings.find(b => b.room_number === roomNumber)
        return {
          roomNumber,
          isOccupied: !!booking,
          booking: booking ? {
            id: booking.id,
            guestName: booking.guest?.[0]?.name || '訪客',
            guestEmail: booking.guest?.[0]?.email || '',
            checkIn: booking.check_in_date,
            checkOut: booking.check_out_date,
            status: booking.status,
          } : null,
        }
      }),
    }
  })
}

/**
 * 查詢用戶在特定期間的房間資訊
 */
export async function getUserRoomBookings(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from('bookings')
    .select(`
      id,
      room_number,
      check_in_date,
      check_out_date,
      guests,
      status,
      property:properties(
        id,
        title,
        address,
        city
      )
    `)
    .eq('guest_id', userId)
    .in('status', ['confirmed', 'pending', 'completed'])

  if (startDate) {
    query = query.gte('check_out_date', startDate)
  }
  if (endDate) {
    query = query.lte('check_in_date', endDate)
  }

  const { data, error } = await query.order('check_in_date', { ascending: true })

  if (error) throw error

  return data?.map((booking: BookingWithProperty) => ({
    bookingId: booking.id,
    roomNumber: booking.room_number || '未分配',
    propertyTitle: booking.property?.[0]?.title || '未知房源',
    address: booking.property?.[0]?.address,
    city: booking.property?.[0]?.city,
    checkIn: booking.check_in_date,
    checkOut: booking.check_out_date,
    guests: booking.guests,
    status: booking.status,
  }))
}

/**
 * 為新預訂自動分配可用房間
 */
export async function assignAvailableRoom(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<string | null> {
  // 1. 獲取房源的所有房間
  const { data: property } = await supabase
    .from('properties')
    .select('room_numbers')
    .eq('id', propertyId)
    .single()

  const allRooms = (property?.room_numbers as string[]) || []
  if (allRooms.length === 0) {
    // 如果沒有設定房間號碼，生成一個預設的
    return `ROOM${Date.now().toString().slice(-6)}`
  }

  // 2. 查詢該期間內已被預訂的房間
  const { data: bookings } = await supabase
    .from('bookings')
    .select('room_number')
    .eq('property_id', propertyId)
    .in('status', ['confirmed', 'pending'])
    .or(`check_in_date.lte.${checkOutDate},check_out_date.gte.${checkInDate}`)

  const occupiedRooms = new Set(
    bookings?.map((b: { room_number: string | null }) => b.room_number).filter(Boolean) || []
  )

  // 3. 找到第一個可用的房間
  const availableRoom = allRooms.find(room => !occupiedRooms.has(room))

  return availableRoom || null
}
