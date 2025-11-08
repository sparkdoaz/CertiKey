"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MembershipCardComponent } from "@/components/membership-card"
import type { MembershipCard } from "@/types/membership-card"
import { CreditCard, Plus, AlertCircle } from "lucide-react"

export default function MembershipCardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [membershipCard, setMembershipCard] = useState<MembershipCard | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Load membership card from localStorage
    const storedCards = JSON.parse(localStorage.getItem("membershipCards") || "[]")
    const userCard = storedCards.find((c: MembershipCard) => c.userId === user.id)
    setMembershipCard(userCard || null)
  }, [user, router])

  const handleApply = async () => {
    if (!user) return

    setIsApplying(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Create new membership card
    const newCard: MembershipCard = {
      id: `card-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      userNationalId: user.nationalId,
      status: "pending",
      qrCodeStatus: "valid",
      appliedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      cardNumber: `MC${Date.now().toString().slice(-8)}`,
    }

    // Save to localStorage
    const storedCards = JSON.parse(localStorage.getItem("membershipCards") || "[]")
    storedCards.push(newCard)
    localStorage.setItem("membershipCards", JSON.stringify(storedCards))

    setMembershipCard(newCard)
    setIsApplying(false)

    // Simulate auto-approval after 3 seconds
    setTimeout(() => {
      const updatedCard = {
        ...newCard,
        status: "active" as const,
        activatedAt: new Date().toISOString(),
      }
      const cards = JSON.parse(localStorage.getItem("membershipCards") || "[]")
      const updatedCards = cards.map((c: MembershipCard) => (c.id === newCard.id ? updatedCard : c))
      localStorage.setItem("membershipCards", JSON.stringify(updatedCards))
      setMembershipCard(updatedCard)
    }, 3000)
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">數位憑證會員卡</h1>
          <p className="text-muted-foreground">申請並管理您的數位會員卡</p>
        </div>

        {membershipCard ? (
          <MembershipCardComponent card={membershipCard} />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-primary" />
                <CardTitle>申請數位憑證會員卡</CardTitle>
              </div>
              <CardDescription>享受會員專屬優惠和便利服務</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">會員卡權益</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>享受訂房優惠折扣</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>快速入住免排隊</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>累積點數兌換獎勵</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>專屬客服優先服務</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>會員限定活動通知</span>
                  </li>
                </ul>
              </div>

              {(!user.phone || !user.nationalId) && (
                <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">請先完善個人資料</p>
                    <p className="mt-1">申請會員卡需要提供電話號碼和身分證字號，請先前往個人資料頁面完成填寫。</p>
                    <Button
                      variant="link"
                      className="mt-2 h-auto p-0 text-yellow-800 underline"
                      onClick={() => router.push("/profile")}
                    >
                      前往個人資料
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={handleApply}
                disabled={isApplying || !user.phone || !user.nationalId}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                {isApplying ? "申請中..." : "立即申請"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
