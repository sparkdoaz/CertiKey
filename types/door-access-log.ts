export interface DoorAccessLog {
  id: string
  bookingId: string
  propertyId: string
  propertyTitle: string
  userId: string
  userName: string
  timestamp: Date
  action: "unlock" | "lock"
  status: "success" | "failed"
  failureReason?: string
  deviceInfo?: string
  location?: string
}
