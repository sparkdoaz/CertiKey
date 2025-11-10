export interface Booking {
  // 資料庫欄位（與 Supabase schema 一致）
  id: string
  guest_id: string
  property_id: string
  check_in_date: string  // DATE 類型（YYYY-MM-DD）
  check_out_date: string // DATE 類型（YYYY-MM-DD）
  guests: number
  total_price: number    // DECIMAL(10,2)
  status: "pending" | "confirmed" | "cancelled" | "completed"
  special_requests?: string
  room_number?: string   // 從 migration 20241110000001 添加
  created_at: string     // TIMESTAMP WITH TIME ZONE
  updated_at: string     // TIMESTAMP WITH TIME ZONE
  
  // Relations (從 JOIN 查詢獲取)
  property?: {
    id: string
    title: string
    vc_title?: string      // 數位憑證專用標題 (只包含英數字和底線)
    description?: string
    address?: string
    city?: string
    price_per_night?: number
    max_guests?: number
    images?: string[]      // JSONB
    image_url?: string     // 兼容性欄位
    host_id: string
    room_numbers?: string[] // JSONB - 從 migration 20241110000001 添加
  }
  guest?: {
    id: string
    name?: string
    email: string          // 從 migration 20241110000000 添加，NOT NULL
    phone?: string
    national_id?: string   // 從 initial_schema 已存在
    national_id_verified?: boolean
    role?: "guest" | "host"
  }
  
  // QR Code functionality（前端狀態管理，不在資料庫中）
  qrCode?: string
  qrCodeStatus?: "valid" | "used" | "expired"
  qrCodeUsedAt?: Date
  
  // Legacy compatibility（相容性欄位，用於前端顯示）
  propertyId?: string
  propertyTitle?: string
  propertyImage?: string
  userId?: string
  userName?: string
  checkIn?: Date
  checkOut?: Date
  totalPrice?: number
  createdAt?: Date
  
  // Co-guest indicator（共享房卡功能）
  isCoGuest?: boolean
  sharedCardId?: string
  sharedCardStatus?: string
}

export interface BookingFormData {
  checkIn: Date
  checkOut: Date
  guests: number
}

export interface SharedRoomCard {
  id: string
  bookingId: string
  guestEmail: string
  guestName?: string
  status: "pending" | "accepted" | "declined" | "revoked"
  invitedAt: Date
  acceptedAt?: Date
  declinedAt?: Date
  revokedAt?: Date
  sharedBookingId?: string
}

export interface RoomCardInvitation {
  id: string
  bookingId: string
  propertyName: string
  inviterEmail: string
  inviterName: string
  inviteeEmail: string
  inviteeName?: string
  checkIn: Date
  checkOut: Date
  status: "pending" | "accepted" | "declined"
  invitedAt: Date
  acceptedAt?: Date
  declinedAt?: Date
  invitationLink: string
}
