import { supabase } from './supabase'
import type { SharedRoomCard, RoomCardInvitation } from '@/types/booking'

// ==================== 共享房卡相關查詢 ====================

/**
 * 獲取訂單的所有共享房卡
 */
export async function getSharedRoomCards(bookingId: string) {
  const { data, error } = await supabase
    .from('shared_room_cards')
    .select(`
      *,
      inviter:inviter_id(id, name, email),
      invitee:invitee_id(id, name, email),
      booking:booking_id(id, property_id, check_in_date, check_out_date)
    `)
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * 創建共享房卡邀請
 */
export async function createSharedRoomCard(data: {
  bookingId: string
  inviterId: string
  inviteeEmail: string
  inviteeName?: string
  invitationToken: string
}) {
  const { data: card, error } = await supabase
    .from('shared_room_cards')
    .insert({
      booking_id: data.bookingId,
      inviter_id: data.inviterId,
      invitee_email: data.inviteeEmail,
      invitee_name: data.inviteeName,
      invitation_token: data.invitationToken,
      status: 'pending'
    })
    .select()
    .single()
  
  if (error) throw error
  return card
}

/**
 * 創建邀請記錄
 */
export async function createRoomCardInvitation(data: {
  sharedCardId: string
  bookingId: string
  propertyName: string
  inviterEmail: string
  inviterName: string
  inviteeEmail: string
  inviteeName?: string
  checkInDate: Date
  checkOutDate: Date
  invitationLink: string
}) {
  const { data: invitation, error } = await supabase
    .from('room_card_invitations')
    .insert({
      shared_card_id: data.sharedCardId,
      booking_id: data.bookingId,
      property_name: data.propertyName,
      inviter_email: data.inviterEmail,
      inviter_name: data.inviterName,
      invitee_email: data.inviteeEmail,
      invitee_name: data.inviteeName,
      check_in_date: data.checkInDate,
      check_out_date: data.checkOutDate,
      invitation_link: data.invitationLink,
      status: 'pending'
    })
    .select()
    .single()
  
  if (error) throw error
  return invitation
}

/**
 * 通過邀請 token 獲取共享房卡
 */
export async function getSharedCardByToken(token: string) {
  const { data, error } = await supabase
    .from('shared_room_cards')
    .select(`
      *,
      inviter:inviter_id(id, name, email),
      booking:booking_id(
        id,
        check_in_date,
        check_out_date,
        property:property_id(id, title, address, images)
      )
    `)
    .eq('invitation_token', token)
    .single()
  
  if (error) throw error
  return data
}

/**
 * 接受共享房卡邀請
 */
export async function acceptSharedRoomCard(cardId: string, userId: string) {
  const { data, error } = await supabase
    .from('shared_room_cards')
    .update({
      invitee_id: userId,
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', cardId)
    .select()
    .single()
  
  if (error) throw error
  
  // 同時更新邀請記錄狀態
  await supabase
    .from('room_card_invitations')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString()
    })
    .eq('shared_card_id', cardId)
  
  return data
}

/**
 * 拒絕共享房卡邀請
 */
export async function declineSharedRoomCard(cardId: string) {
  const { data, error } = await supabase
    .from('shared_room_cards')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString()
    })
    .eq('id', cardId)
    .select()
    .single()
  
  if (error) throw error
  
  // 同時更新邀請記錄狀態
  await supabase
    .from('room_card_invitations')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString()
    })
    .eq('shared_card_id', cardId)
  
  return data
}

/**
 * 撤銷共享房卡
 */
export async function revokeSharedRoomCard(cardId: string) {
  const { data, error } = await supabase
    .from('shared_room_cards')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString()
    })
    .eq('id', cardId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * 獲取用戶收到的邀請
 */
export async function getUserInvitations(userEmail: string) {
  const { data, error } = await supabase
    .from('room_card_invitations')
    .select('*')
    .eq('invitee_email', userEmail)
    .order('invited_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * 獲取用戶作為同住者的所有訂單
 */
export async function getCoGuestBookings(userId: string, userEmail: string) {
  const { data, error } = await supabase
    .from('shared_room_cards')
    .select(`
      *,
      booking:booking_id(
        *,
        property:property_id(*)
      )
    `)
    .or(`invitee_id.eq.${userId},invitee_email.eq.${userEmail}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * 檢查用戶是否有訂單的訪問權限
 * @returns 'primary' (主住者) | 'co-guest' (同住者) | null (無權限)
 */
export async function checkBookingAccess(bookingId: string, userId: string, userEmail: string) {
  // 檢查是否為主住者
  const { data: booking } = await supabase
    .from('bookings')
    .select('guest_id')
    .eq('id', bookingId)
    .single()
  
  if (booking && booking.guest_id === userId) {
    return 'primary'
  }
  
  // 檢查是否為同住者
  const { data: sharedCard } = await supabase
    .from('shared_room_cards')
    .select('id')
    .eq('booking_id', bookingId)
    .or(`invitee_id.eq.${userId},invitee_email.eq.${userEmail}`)
    .eq('status', 'accepted')
    .single()
  
  if (sharedCard) {
    return 'co-guest'
  }
  
  return null
}

/**
 * 獲取訂單的所有訪客 (主住者 + 同住者)
 */
export async function getBookingGuests(bookingId: string) {
  const { data, error } = await supabase
    .from('booking_guests')
    .select('*')
    .eq('booking_id', bookingId)
  
  if (error) throw error
  return data
}
