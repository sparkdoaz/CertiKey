"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2, DoorOpen } from "lucide-react"
import QRCode from "react-qr-code"
import type { Booking } from "@/types/booking"

type DoorState = "idle" | "qrcode" | "success" | "error"
type ErrorType = "expired" | "unauthorized" | "already-used"

interface SmartDoorDemoClientProps {
  initialBooking: Booking | null
  initialProperty: PropertyInfo | null
  initialError: string | null
}

interface PropertyInfo {
  id: string
  title: string
  vc_title?: string
}

export function SmartDoorDemoClient({ initialBooking, initialProperty, initialError }: SmartDoorDemoClientProps) {
  const [state, setState] = useState<DoorState>("idle")
  const [countdown, setCountdown] = useState(30)
  const [errorType, setErrorType] = useState<ErrorType>("expired")
  const [isAnimating, setIsAnimating] = useState(false)
  const [qrCodeValue, setQrCodeValue] = useState("")

  const roomNumber = initialBooking?.room_number || "未分配"

  useEffect(() => {
    if (state === "qrcode" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (state === "qrcode" && countdown === 0) {
      handleError("expired")
    }
  }, [state, countdown])

  const handleOpenDoor = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setQrCodeValue(`DOOR_ACCESS:${roomNumber}:${Date.now()}`)
      setState("qrcode")
      setCountdown(30)
      setIsAnimating(false)
    }, 300)
  }

  const handleScanSuccess = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setState("success")
      setIsAnimating(false)
    }, 500)
  }

  const handleScanError = (type: ErrorType) => {
    setIsAnimating(true)
    setTimeout(() => {
      handleError(type)
      setIsAnimating(false)
    }, 500)
  }

  const handleError = (type: ErrorType) => {
    setErrorType(type)
    setState("error")
  }

  const handleReset = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setState("idle")
      setCountdown(30)
      setIsAnimating(false)
    }, 300)
  }

  const getErrorMessage = () => {
    switch (errorType) {
      case "expired":
        return "此 QR Code 已過期"
      case "unauthorized":
        return "您沒有開門資格"
      case "already-used":
        return "此 QR Code 已經被使用"
      default:
        return "開門失敗"
    }
  }

  if (initialError || !initialBooking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[oklch(0.25_0.05_240)] to-[oklch(0.15_0.03_260)] p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-400" />
          <h2 className="mt-4 text-xl font-bold text-white">載入失敗</h2>
          <p className="mt-2 text-red-300">{initialError || "無法獲取訂單信息"}</p>
          <Button
            onClick={() => window.history.back()}
            className="mt-4 bg-gradient-to-r from-[oklch(0.75_0.15_45)] to-[oklch(0.65_0.15_35)] text-[oklch(0.15_0.03_260)]"
          >
            返回
          </Button>
        </Card>
      </div>
    )
  }

  const progressPercentage = (countdown / 30) * 100

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[oklch(0.25_0.05_240)] to-[oklch(0.15_0.03_260)] p-4">
      <div className="w-full max-w-md">
        <Card
          className={`overflow-hidden border-2 border-[oklch(0.45_0.08_240)] bg-gradient-to-b from-[oklch(0.20_0.04_250)] to-[oklch(0.15_0.03_260)] p-8 text-white shadow-2xl transition-all duration-300 ${isAnimating ? "scale-95 opacity-50" : "scale-100 opacity-100"
            }`}
        >
          {/* Idle State */}
          {state === "idle" && (
            <div className="flex flex-col items-center gap-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <DoorOpen className="h-16 w-16 text-[oklch(0.75_0.15_45)]" />
                <h1 className="text-3xl font-bold text-white">智慧房門系統</h1>
                <p className="text-lg text-[oklch(0.70_0.05_240)]">{initialProperty?.title || "未知房間"}</p>
                <p className="text-sm text-[oklch(0.60_0.05_240)]">房號 {roomNumber}</p>
              </div>

              <Button
                onClick={handleOpenDoor}
                size="lg"
                className="h-32 w-32 rounded-full bg-gradient-to-br from-[oklch(0.75_0.15_45)] to-[oklch(0.65_0.15_35)] text-xl font-bold text-[oklch(0.15_0.03_260)] shadow-lg hover:scale-105 hover:shadow-[oklch(0.75_0.15_45)]/50 active:scale-95"
              >
                開門
              </Button>

              <p className="text-sm text-[oklch(0.60_0.05_240)]">點擊按鈕開始開門流程</p>
            </div>
          )}

          {/* QR Code State */}
          {state === "qrcode" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="text-2xl font-bold text-white">請掃描開門 QR Code</h2>

              <div className="relative">
                <div className="rounded-2xl bg-white p-6">
                  <QRCode value={qrCodeValue} size={200} />
                </div>

                {/* Countdown Circle */}
                <div className="absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.75_0.15_45)] to-[oklch(0.65_0.15_35)] text-xl font-bold text-[oklch(0.15_0.03_260)] shadow-lg">
                  <svg className="absolute inset-0 h-16 w-16 -rotate-90 transform">
                    <circle cx="32" cy="32" r="28" stroke="oklch(0.3 0.05 240)" strokeWidth="4" fill="none" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="oklch(0.95 0.15 45)"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <span className="relative z-10">{countdown}</span>
                </div>
              </div>

              <p className="text-sm text-[oklch(0.70_0.05_240)]">請使用 App 掃描此 QR Code 進行開門授權</p>

              {/* Simulation Buttons */}
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-xs text-[oklch(0.60_0.05_240)]">模擬測試：</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleScanSuccess}
                    size="sm"
                    variant="outline"
                    className="border-green-500/50 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    模擬成功
                  </Button>
                  <Button
                    onClick={() => handleScanError("unauthorized")}
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    無權限
                  </Button>
                  <Button
                    onClick={() => handleScanError("already-used")}
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    已使用
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {state === "success" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="animate-bounce">
                <CheckCircle2 className="h-24 w-24 text-green-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">開門成功</h2>
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">門鎖開啟中...</p>
                </div>
              </div>

              <div className="rounded-lg bg-green-500/20 px-6 py-3">
                <p className="text-lg text-green-300">歡迎光臨！請進房間</p>
              </div>

              <Button
                onClick={handleReset}
                size="lg"
                className="mt-4 bg-gradient-to-r from-[oklch(0.75_0.15_45)] to-[oklch(0.65_0.15_35)] text-[oklch(0.15_0.03_260)] hover:opacity-90"
              >
                確認
              </Button>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="animate-shake">
                <XCircle className="h-24 w-24 text-red-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">開門失敗</h2>
                <div className="rounded-lg bg-red-500/20 px-6 py-3">
                  <p className="text-lg text-red-300">{getErrorMessage()}</p>
                </div>
              </div>

              <p className="text-sm text-[oklch(0.60_0.05_240)]">請聯繫客服或重試</p>

              <Button
                onClick={handleReset}
                size="lg"
                className="mt-4 bg-gradient-to-r from-[oklch(0.75_0.15_45)] to-[oklch(0.65_0.15_35)] text-[oklch(0.15_0.03_260)] hover:opacity-90"
              >
                確認
              </Button>
            </div>
          )}
        </Card>

        {/* Demo Info */}
        <div className="mt-4 text-center text-xs text-white/60">
          <p>這是智慧房門系統的展示介面</p>
          <p>實際使用時會連接真實的門鎖系統</p>
        </div>
      </div>
    </div>
  )
}