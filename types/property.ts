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
  // Relations
  host?: {
    id: string
    name?: string
    email: string
  }
  // Legacy compatibility
  type?: "apartment" | "house" | "villa" | "studio"
  price?: number
  location?: string
  country?: string
  guests?: number
  hostId?: string
  hostName?: string
  rating?: number
  reviews?: number
}

export interface SearchFilters {
  location?: string
  checkIn?: Date
  checkOut?: Date
  guests?: number
  minPrice?: number
  maxPrice?: number
  propertyType?: Property["type"]
}
