// Database types
export interface UserProfile {
  id: string
  name?: string
  role: 'guest' | 'host'
  phone?: string
  national_id?: string
  national_id_verified?: boolean
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  host_id: string
  title: string
  description?: string
  address: string
  city: string
  price_per_night: number
  max_guests: number
  bedrooms: number
  bathrooms: number
  amenities?: string[]
  images?: string[]
  latitude?: number
  longitude?: number
  available: boolean
  created_at: string
  updated_at: string
  host?: UserProfile
}

export interface Booking {
  id: string
  guest_id: string
  property_id: string
  check_in_date: string
  check_out_date: string
  guests: number
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  special_requests?: string
  created_at: string
  updated_at: string
  property?: Property
  guest?: UserProfile
}

export interface DoorAccessLog {
  id: string
  booking_id: string
  property_id: string
  user_id: string
  access_time: string
  access_type: 'unlock' | 'lock'
  method: 'digital_key' | 'mobile_app' | 'physical_key'
  success: boolean
  created_at: string
  user?: UserProfile
  booking?: Booking
}

export interface MembershipCard {
  id: string
  user_id: string
  card_number: string
  card_type: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  tier_benefits?: string[]
  issued_at: string
  expires_at?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface DoorQrCode {
  id: string
  property_id: string
  transaction_id: string
  room: string
  status: 'active' | 'used' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
  expires_at: string
  used_at?: string
}