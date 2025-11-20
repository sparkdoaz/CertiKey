import { supabase } from './supabase'

// User Profile functions
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Properties functions
export async function getProperties(filters?: any) {
  let query = supabase
    .from('properties')
    .select('*, host:user_profiles(*)')
    .eq('available', true)
  
  if (filters?.city) {
    query = query.eq('city', filters.city)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  // 轉換每個房源的資料格式
  if (data) {
    return data.map(property => ({
      ...property,
      price: property.price_per_night,
      guests: property.max_guests,
      location: property.address,
      hostId: property.host_id,
      hostName: property.host?.name,
      rating: 4.8,
      reviews: 128,
      country: '台灣'
    }))
  }
  
  return data
}

export async function getProperty(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*, host:user_profiles(*)')
    .eq('id', id)
    .single()
  
  if (error) throw error
  
  // 轉換資料格式,確保前端相容性
  if (data) {
    return {
      ...data,
      price: data.price_per_night, // 將 price_per_night 映射到 price
      guests: data.max_guests, // 將 max_guests 映射到 guests
      location: data.address, // 將 address 映射到 location
      hostId: data.host_id,
      hostName: data.host?.name,
      // 添加模擬的評分資料(如果資料庫沒有)
      rating: 4.8,
      reviews: 128,
      country: '台灣'
    }
  }
  
  return data
}

export async function createProperty(property: any) {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Bookings functions
/**
 * 獲取所有訂單（用於展示和測試）
 */
export async function getAllBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, property:properties(*), guest:user_profiles(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  // 轉換資料格式以符合前端 Booking 介面
  if (data && data.length > 0) {
    return data.map(booking => ({
      // 主要欄位
      id: booking.id,
      guest_id: booking.guest_id,
      property_id: booking.property_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      guests: booking.guests,
      total_price: booking.total_price,
      status: booking.status,
      room_number: booking.room_number, // 新增房號
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      // 相容性欄位
      userId: booking.guest_id,
      propertyId: booking.property_id,
      propertyTitle: booking.property?.title || '未知房源',
      propertyImage: booking.property?.images?.[0] || booking.property?.image_url || '',
      checkIn: new Date(booking.check_in_date),
      checkOut: new Date(booking.check_out_date),
      totalPrice: booking.total_price,
      createdAt: new Date(booking.created_at),
      // Relations
      property: booking.property,
      guest: booking.guest,
      // 標記
      isCoGuest: false
    }))
  }
  
  return []
}

/**
 * 獲取用戶的所有訂單 (包含作為主住者和同住者的訂單)
 * @param userId - 用戶 ID
 * @param userEmail - 用戶 Email (用於查詢同住者訂單)
 */
export async function getUserBookings(userId: string, userEmail?: string) {
  // 1. 查詢作為主住者的訂單
  const { data: primaryBookings, error: primaryError } = await supabase
    .from('bookings')
    .select('*, property:properties(*)')
    .eq('guest_id', userId)
    .order('created_at', { ascending: false })
  
  if (primaryError) throw primaryError
  
  // 2. 查詢作為同住者的訂單 (如果有提供 email)
  let coGuestBookings: any[] = []
  if (userEmail) {
    const { data: sharedCards, error: sharedError } = await supabase
      .from('shared_room_cards')
      .select('*, booking:bookings(*, property:properties(*))')
      .or(`invitee_id.eq.${userId},invitee_email.eq.${userEmail}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    
    if (sharedError) {
      console.error('Failed to fetch co-guest bookings:', sharedError)
    } else if (sharedCards) {
      coGuestBookings = sharedCards
        .filter(card => card.booking) // 確保有 booking 資料
        .map(card => ({
          ...card.booking,
          // 標記這是同住者訂單
          isCoGuest: true,
          sharedCardId: card.id,
          sharedCardStatus: card.status
        }))
    }
  }
  
  // 3. 合併兩種訂單
  const allBookings = [
    ...(primaryBookings || []).map(b => ({ ...b, isCoGuest: false })),
    ...coGuestBookings
  ]
  
  // 4. 按創建時間排序
  allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  // 5. 轉換資料格式以符合前端 Booking 介面
  if (allBookings.length > 0) {
    return allBookings.map(booking => ({
      // 主要欄位
      id: booking.id,
      guest_id: booking.guest_id,
      property_id: booking.property_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      guests: booking.guests,
      total_price: booking.total_price,
      status: booking.status,
      room_number: booking.room_number, // 新增房號
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      // 相容性欄位
      userId: booking.guest_id,
      propertyId: booking.property_id,
      propertyTitle: booking.property?.title || '',
      propertyImage: booking.property?.images?.[0] || booking.property?.image_url || '',
      checkIn: new Date(booking.check_in_date),
      checkOut: new Date(booking.check_out_date),
      totalPrice: booking.total_price,
      createdAt: new Date(booking.created_at),
      // Relations
      property: booking.property,
      // 同住者標記
      isCoGuest: booking.isCoGuest,
      sharedCardId: booking.sharedCardId,
      sharedCardStatus: booking.sharedCardStatus
    }))
  }
  
  return []
}

export async function getBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, property:properties(*), guest:user_profiles(*)')
    .eq('id', bookingId)
    .maybeSingle()
  
  if (error) throw error
  
  // 轉換資料格式
  if (data) {
    const booking = {
      // 資料庫原始欄位
      id: data.id,
      guest_id: data.guest_id,
      property_id: data.property_id,
      check_in_date: data.check_in_date,
      check_out_date: data.check_out_date,
      guests: data.guests,
      total_price: data.total_price,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      special_requests: data.special_requests,
      room_number: data.room_number,
      // 相容性欄位
      userId: data.guest_id,
      propertyId: data.property_id,
      propertyTitle: data.property?.title || '',
      propertyImage: data.property?.images?.[0] || data.property?.image_url || '',
      checkIn: data.check_in_date,
      checkOut: data.check_out_date,
      totalPrice: data.total_price,
      createdAt: data.created_at,
      guestName: data.guest?.name,
      guestEmail: data.guest?.email,
      // Relations
      property: data.property,
      guest: data.guest
    }
    
    // 確保返回的對象是可序列化的
    return JSON.parse(JSON.stringify(booking))
  }
  
  return null
}

export async function getHostBookings(hostId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, property:properties!inner(*), guest:user_profiles(*)')
    .eq('property.host_id', hostId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  // 轉換資料格式，包含完整的 Booking 介面屬性
  if (data) {
    return data.map(booking => ({
      // 主要欄位
      id: booking.id,
      guest_id: booking.guest_id,
      property_id: booking.property_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      guests: booking.guests,
      total_price: booking.total_price,
      status: booking.status,
      room_number: booking.room_number, // 新增房號
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      // 相容性欄位
      userId: booking.guest_id,
      propertyId: booking.property_id,
      propertyTitle: booking.property?.title || '',
      propertyImage: booking.property?.images?.[0] || booking.property?.image_url || '',
      checkIn: new Date(booking.check_in_date),
      checkOut: new Date(booking.check_out_date),
      totalPrice: booking.total_price,
      createdAt: new Date(booking.created_at),
      userName: booking.guest?.name,
      guestName: booking.guest?.name,
      guestEmail: booking.guest?.email,
      // Relations
      property: booking.property,
      guest: booking.guest
    }))
  }
  
  return data
}

export async function createBooking(booking: {
  guest_id: string
  property_id: string
  check_in_date: string
  check_out_date: string
  guests: number
  total_price: number
  status?: string
}) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...booking,
      status: booking.status || 'pending'
    })
    .select('*, property:properties(*)')
    .single()
  
  if (error) throw error
  
  // 轉換資料格式
  if (data) {
    return {
      id: data.id,
      userId: data.guest_id,
      propertyId: data.property_id,
      propertyTitle: data.property?.title || '',
      propertyImage: data.property?.images?.[0] || data.property?.image_url || '',
      checkIn: data.check_in_date,
      checkOut: data.check_out_date,
      guests: data.guests,
      totalPrice: data.total_price,
      status: data.status,
      createdAt: data.created_at
    }
  }
  
  return data
}

export async function updateBooking(id: string, updates: any) {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*, property:properties(*)')
    .single()
  
  if (error) throw error
  
  // 轉換資料格式
  if (data) {
    return {
      id: data.id,
      userId: data.guest_id,
      propertyId: data.property_id,
      propertyTitle: data.property?.title || '',
      propertyImage: data.property?.images?.[0] || data.property?.image_url || '',
      checkIn: data.check_in_date,
      checkOut: data.check_out_date,
      guests: data.guests,
      totalPrice: data.total_price,
      status: data.status,
      createdAt: data.created_at
    }
  }
  
  return data
}

// Door Access Logs functions
export async function getDoorAccessLogs(propertyId: string) {
  const { data, error } = await supabase
    .from('door_access_logs')
    .select('*, user:user_profiles(*), booking:bookings(*)')
    .eq('property_id', propertyId)
    .order('access_time', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getDoorAccessLogsByUser(userId: string) {
  const { data, error } = await supabase
    .from('door_access_logs')
    .select('*, property:properties(*), booking:bookings(*)')
    .eq('user_id', userId)
    .order('access_time', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getDoorAccessLogsByBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('door_access_logs')
    .select('*, user:user_profiles(*), property:properties(*)')
    .eq('booking_id', bookingId)
    .order('access_time', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createDoorAccessLog(accessLog: {
  user_id: string
  property_id: string
  booking_id?: string
  access_type: string
  access_method: string
  status: string
  location?: string
}) {
  const { data, error } = await supabase
    .from('door_access_logs')
    .insert(accessLog)
    .select('*, property:properties(*)')
    .single()
  
  if (error) throw error
  return data
}

// Membership Cards functions
export async function getUserMembershipCard(userId: string) {
  const { data, error } = await supabase
    .from('membership_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createMembershipCard(membershipCard: any) {
  const { data, error } = await supabase
    .from('membership_cards')
    .insert(membershipCard)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateMembershipCard(id: string, updates: any) {
  const { data, error } = await supabase
    .from('membership_cards')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}