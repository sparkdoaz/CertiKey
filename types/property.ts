export interface Property {
  id: string
  title: string
  description: string
  type: "apartment" | "house" | "villa" | "studio"
  price: number
  location: string
  city: string
  country: string
  bedrooms: number
  bathrooms: number
  guests: number
  images: string[]
  amenities: string[]
  hostId: string
  hostName: string
  rating: number
  reviews: number
  available: boolean
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
