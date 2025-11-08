"use client"

import { useEffect, useRef, useState } from "react"
import type { Booking } from "@/types/booking"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, Users, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import QRCode from "qrcode"

interface DigitalRoomCardProps {
  booking: Booking
}

export function DigitalRoomCard({ booking }: DigitalRoomCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean
    title: string
    description: string
    type: "expired" | "used" | "invalid" | null
  }>({
    open: false,
    title: "",
    description: "",
    type: null,
  })
  const [qrCodeStatus, setQrCodeStatus] = useState<"valid" | "used" | "expired" | "not-ready">("valid")

  useEffect(() => {
    const checkQRCodeValidity = () => {
      const now = new Date()
      const checkInDate = new Date(booking.checkIn)
      const checkOutDate = new Date(booking.checkOut)

      // QRCode 在入住日期前 24 小時開始有效
      const validFromDate = new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000)

      // 檢查是否已被使用
      if (booking.qrCodeStatus === "used") {
        setQrCodeStatus("used")
        setErrorDialog({
          open: true,
          title: "QR Code 已被使用",
          description: `此 QR Code 已於 ${booking.qrCodeUsedAt ? new Date(booking.qrCodeUsedAt).toLocaleString("zh-TW") : "先前"} 被掃描使用，無法再次使用。如有問題請聯繫客服。`,
          type: "used",
        })
        return
      }

      // 檢查是否已過期（退房日期後）
      if (now > checkOutDate) {
        setQrCodeStatus("expired")
        setErrorDialog({
          open: true,
          title: "QR Code 已過期",
          description: `此 QR Code 已於退房日期（${checkOutDate.toLocaleDateString("zh-TW")}）後失效，無法繼續使用。`,
          type: "expired",
        })
        return
      }

      // 檢查是否還未到可用時間
      if (now < validFromDate) {
        setQrCodeStatus("not-ready")
        setErrorDialog({
          open: true,
          title: "QR Code 尚未生效",
          description: `此 QR Code 將於入住日期前 24 小時（${validFromDate.toLocaleString("zh-TW")}）開始生效，請稍後再試。`,
          type: "invalid",
        })
        return
      }

      // QRCode 有效
      setQrCodeStatus("valid")
    }

    checkQRCodeValidity()
  }, [booking])

  useEffect(() => {
    if (canvasRef.current && qrCodeStatus === "valid") {
      const qrData = JSON.stringify({
        bookingId: booking.id,
        propertyId: booking.propertyId,
        userId: booking.userId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        timestamp: new Date().toISOString(),
      })

      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
    }
  }, [booking, qrCodeStatus])

  const handleSimulateUsage = () => {
    const bookings = JSON.parse(localStorage.getItem("bookings") || "[]")
    const updatedBookings = bookings.map((b: Booking) => {
      if (b.id === booking.id) {
        return {
          ...b,
          qrCodeStatus: "used",
          qrCodeUsedAt: new Date().toISOString(),
        }
      }
      return b
    })
    localStorage.setItem("bookings", JSON.stringify(updatedBookings))

    setQrCodeStatus("used")
    setErrorDialog({
      open: true,
      title: "QR Code 已被使用",
      description: `此 QR Code 已於 ${new Date().toLocaleString("zh-TW")} 被掃描使用，無法再次使用。`,
      type: "used",
    })
  }

  const getStatusBadge = () => {
    switch (qrCodeStatus) {
      case "valid":
        return (
          <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            有效
          </div>
        )
      case "used":
        return (
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            <XCircle className="h-4 w-4" />
            已使用
          </div>
        )
      case "expired":
        return (
          <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
            <AlertTriangle className="h-4 w-4" />
            已過期
          </div>
        )
      case "not-ready":
        return (
          <div className="flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            尚未生效
          </div>
        )
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">數位房卡</CardTitle>
            {getStatusBadge()}
          </div>
          <p className="text-center text-sm text-primary-foreground/90">
            {qrCodeStatus === "valid" ? "請使用專屬 App 掃描此 QR Code" : "此 QR Code 目前無法使用"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="rounded-lg bg-white p-4 shadow-lg">
              {qrCodeStatus === "valid" ? (
                <canvas ref={canvasRef} className="h-64 w-64" />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <XCircle className="mx-auto h-16 w-16 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">QR Code 無法顯示</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Booking Details */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">{booking.propertyTitle}</h3>
              <p className="text-sm text-muted-foreground">訂單編號：{booking.id}</p>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">入住時間</p>
                  <p className="text-muted-foreground">
                    {new Date(booking.checkIn).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">退房時間</p>
                  <p className="text-muted-foreground">
                    {new Date(booking.checkOut).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">房客人數</p>
                  <p className="text-muted-foreground">{booking.guests} 位</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Instructions */}
          <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
            {qrCodeStatus === "valid" ? (
              <>
                <p className="font-medium">請使用專屬 App 掃描 QR Code 以獲取房卡</p>
                <p className="mt-1">掃描後即可在 App 中查看並使用數位房卡</p>
                <p className="mt-2 text-xs">QR Code 將於退房日期後自動失效</p>
              </>
            ) : (
              <>
                <p className="font-medium text-destructive">此 QR Code 目前無法使用</p>
                <p className="mt-1">請查看上方狀態說明</p>
              </>
            )}
          </div>

          {qrCodeStatus === "valid" && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4">
              <p className="mb-2 text-center text-xs text-muted-foreground">測試功能</p>
              <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={handleSimulateUsage}>
                模擬 QR Code 被掃描使用
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">{errorDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>確定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
