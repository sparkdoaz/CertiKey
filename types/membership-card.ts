export interface MembershipCard {
  id: string
  userId: string
  userName: string
  userEmail: string
  userPhone?: string
  userNationalId?: string
  status: "pending" | "active" | "expired" | "revoked"
  qrCodeStatus: "valid" | "used" | "expired"
  qrCodeUsedAt?: string
  appliedAt: string
  activatedAt?: string
  expiresAt: string
  cardNumber: string
}
