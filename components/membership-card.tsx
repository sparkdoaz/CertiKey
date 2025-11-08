"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { MembershipCard } from "@/types/membership-card"
import QRCode from "qrcode"
import { Calendar, CreditCard, User, Mail, Phone, Award as IdCard, AlertCircle, CheckCircle2 } from "lucide-react"

interface MembershipCardProps {
  card: MembershipCard
}

export function MembershipCardComponent({ card }: MembershipCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean
    title: string
    description: string
  }>({
    open: false,
    title: "",
    description: "",
  })

  useEffect(() => {
    const checkCardValidity = () => {
      const now = new Date()
      const expiresAt = new Date(card.expiresAt)

      // Check if card is expired
      if (now > expiresAt) {
        setErrorDialog({
          open: true,
          title: "會員卡已過期",
          description: `此會員卡已於 ${expiresAt.toLocaleDateString("zh-TW")} 過期，請重新申請新的會員卡。`,
        })
        return false
      }

      // Check if QR code is used
      if (card.qrCodeStatus === "used") {
        setErrorDialog({
          open: true,
          title: "QR Code 已被使用",
          description: `此 QR Code 已於 ${card.qrCodeUsedAt ? new Date(card.qrCodeUsedAt).toLocaleString("zh-TW") : "先前"} 被使用過，無法再次使用。`,
        })
        return false
      }

      // Check if QR code is expired
      if (card.qrCodeStatus === "expired") {
        setErrorDialog({
          open: true,
          title: "QR Code 已失效",
          description: "此 QR Code 已失效，請聯繫客服重新生成。",
        })
        return false
      }

      return true
    }

    const isValid = checkCardValidity()

    if (isValid && card.status === "active") {
      const qrData = JSON.stringify({
        type: "membership-card",
        cardId: card.id,
        cardNumber: card.cardNumber,
        userId: card.userId,
        userName: card.userName,
        expiresAt: card.expiresAt,
        timestamp: new Date().toISOString(),
      })

      QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then(setQrCodeUrl)
        .catch(console.error)
    }
  }, [card])

  const handleTestScan = () => {
    // Simulate QR code being scanned
    const updatedCard = {
      ...card,
      qrCodeStatus: "used" as const,
      qrCodeUsedAt: new Date().toISOString(),
    }

    const storedCards = JSON.parse(localStorage.getItem("membershipCards") || "[]")
    const updatedCards = storedCards.map((c: MembershipCard) => (c.id === card.id ? updatedCard : c))
    localStorage.setItem("membershipCards", JSON.stringify(updatedCards))

    window.location.reload()
  }

  const getStatusBadge = () => {
    const variants = {
      pending: { label: "待審核", variant: "secondary" as const, icon: AlertCircle },
      active: { label: "已啟用", variant: "default" as const, icon: CheckCircle2 },
      expired: { label: "已過期", variant: "destructive" as const, icon: AlertCircle },
      revoked: { label: "已撤銷", variant: "destructive" as const, icon: AlertCircle },
    }
    return variants[card.status]
  }

  const statusInfo = getStatusBadge()
  const StatusIcon = statusInfo.icon

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              <CardTitle>數位憑證會員卡</CardTitle>
            </div>
            <Badge variant={statusInfo.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
          <CardDescription className="text-primary-foreground/80">卡號：{card.cardNumber}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Member Information */}
          <div className="space-y-3">
            <h3 className="font-semibold">會員資訊</h3>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{card.userName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{card.userEmail}</span>
              </div>
              {card.userPhone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{card.userPhone}</span>
                </div>
              )}
              {card.userNationalId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IdCard className="h-4 w-4" />
                  <span>{card.userNationalId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card Details */}
          <div className="space-y-3">
            <h3 className="font-semibold">卡片詳情</h3>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>申請日期：{new Date(card.appliedAt).toLocaleDateString("zh-TW")}</span>
              </div>
              {card.activatedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>啟用日期：{new Date(card.activatedAt).toLocaleDateString("zh-TW")}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>到期日期：{new Date(card.expiresAt).toLocaleDateString("zh-TW")}</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {card.status === "active" && qrCodeUrl && !errorDialog.open && (
            <div className="space-y-3">
              <h3 className="font-semibold">會員卡 QR Code</h3>
              <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6">
                <img src={qrCodeUrl || "/placeholder.svg"} alt="Membership Card QR Code" className="h-64 w-64" />
                <p className="text-center text-sm text-muted-foreground">
                  請使用專屬 App 掃描此 QR Code 以驗證會員身分
                </p>
              </div>

              {/* Test Button */}
              <Button onClick={handleTestScan} variant="outline" className="w-full bg-transparent" size="sm">
                測試掃描（模擬 QR Code 被使用）
              </Button>
            </div>
          )}

          {card.status === "pending" && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="font-medium">審核中</p>
              <p className="mt-1">您的會員卡申請正在審核中，預計 1-3 個工作天完成審核。</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <Button onClick={() => setErrorDialog({ ...errorDialog, open: false })}>確定</Button>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
