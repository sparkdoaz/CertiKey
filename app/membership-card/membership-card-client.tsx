"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getUserMembershipCard, createMembershipCard, updateMembershipCard } from "@/lib/supabase-queries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MembershipCardComponent } from "@/components/membership-card"
import type { MembershipCard } from "@/types/membership-card"
import { CreditCard, Plus, AlertCircle } from "lucide-react"

export default function MembershipCardClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [membershipCard, setMembershipCard] = useState<MembershipCard | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchMembershipCard = async () => {
      try {
        setLoading(true)
        const card = await getUserMembershipCard(user.id)

        if (card) {
          // 轉換資料格式
          const formattedCard: MembershipCard = {
            id: card.id,
            userId: card.user_id,
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            userNationalId: user.nationalId,
            status: card.status as "pending" | "active" | "expired" | "revoked",
            qrCodeStatus: "valid",
            appliedAt: card.created_at,
            activatedAt: card.activated_at,
            expiresAt: card.expires_at,
            cardNumber: card.card_number
          }
          setMembershipCard(formattedCard)
        }
      } catch (error) {
        console.error('Failed to fetch membership card:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMembershipCard()
  }, [user, router])

  const handleApply = async () => {
    if (!user) return

    setIsApplying(true)

    try {
      const cardNumber = `MC${Date.now().toString().slice(-8)}`
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      // 創建會員卡到 Supabase
      const newCard = await createMembershipCard({
        user_id: user.id,
        card_number: cardNumber,
        status: 'pending',
        expires_at: expiresAt,
        active: true
      })

      const formattedCard: MembershipCard = {
        id: newCard.id,
        userId: newCard.user_id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        userNationalId: user.nationalId,
        status: 'pending',
        qrCodeStatus: "valid",
        appliedAt: newCard.created_at,
        activatedAt: undefined,
        expiresAt: newCard.expires_at,
        cardNumber: newCard.card_number
      }

      setMembershipCard(formattedCard)

      // 模擬自動審核通過
      setTimeout(async () => {
        try {
          const updatedCard = await updateMembershipCard(newCard.id, {
            status: 'active',
            activated_at: new Date().toISOString()
          })

          const formattedUpdatedCard: MembershipCard = {
            ...formattedCard,
            status: 'active',
            activatedAt: updatedCard.activated_at
          }
          setMembershipCard(formattedUpdatedCard)
        } catch (error) {
          console.error('Failed to activate membership card:', error)
        }
      }, 3000)
    } catch (error) {
      console.error('Failed to create membership card:', error)
      alert('申請會員卡失敗，請稍後再試')
    } finally {
      setIsApplying(false)
    }
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    )
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