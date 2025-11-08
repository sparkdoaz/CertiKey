export interface Booking {
  id: string
  propertyId: string
  propertyTitle: string
  propertyImage: string
  userId: string
  userName: string
  checkIn: Date
  checkOut: Date
  guests: number
  totalPrice: number
  status: "pending" | "confirmed" | "cancelled" | "completed"
  createdAt: Date
  qrCode?: string
  qrCodeStatus?: "valid" | "used" | "expired"
  qrCodeUsedAt?: Date
}

export interface BookingFormData {
  checkIn: Date
  checkOut: Date
  guests: number
}
