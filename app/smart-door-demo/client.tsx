"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2, DoorOpen } from "lucide-react"
import { getDoorQRCode, checkVerificationResult } from "./actions"

type DoorState = "idle" | "qrcode" | "success" | "error"
type ErrorType = "expired" | "unauthorized" | "already-used"

interface SmartDoorDemoClientProps {
  initialProperty: PropertyInfo | null
  initialRoom: string | null
  initialError: string | null
}

interface PropertyInfo {
  id: string
  title: string
  vc_title?: string
}

const COUNTDOWN_SECONDS = 900
const CHECK_INTERVAL_MS = 5000

export function SmartDoorDemoClient({ initialProperty, initialRoom, initialError }: SmartDoorDemoClientProps) {
  const [state, setState] = useState<DoorState>("idle")
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [errorType, setErrorType] = useState<ErrorType>("expired")
  const [isAnimating, setIsAnimating] = useState(false)
  const [qrCodeValue, setQrCodeValue] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [isPending, startTransition] = useTransition()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (state === "qrcode" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (state === "qrcode" && countdown === 0) {
      handleError("expired")
    }
  }, [state, countdown])

  useEffect(() => {
    console.log(`[useEffect] 檢查條件 - state: ${state}, transactionId: ${transactionId}, countdown: ${countdown}`)
    if (state === "qrcode" && transactionId && countdown > 0) {
      console.log(`[useEffect] 條件滿足，開始設置檢查間隔`)
      const checkResult = async () => {
        // 檢查 countdown 是否還有效
        if (countdown <= 0) {
          console.log(`[${new Date().toLocaleTimeString()}] Countdown 已結束，停止檢查`)
          return
        }

        console.log(`[${new Date().toLocaleTimeString()}] 開始檢查驗證結果...`)
        const isVerified = await checkVerificationResult(transactionId)
        console.log(`[${new Date().toLocaleTimeString()}] 檢查結果:`, isVerified)

        if (isVerified === false) {
          console.log(`[${new Date().toLocaleTimeString()}] 驗證尚未成功，繼續檢查`)
          // 驗證尚未成功，繼續等待下次檢查
          return
        }

        if (isVerified) {
          console.log(`[${new Date().toLocaleTimeString()}] 驗證成功！`)
          handleScanSuccess()
        }
      }

      // 每 5 秒檢查一次
      const interval = setInterval(checkResult, CHECK_INTERVAL_MS)
      console.log(`[useEffect] 設置了檢查間隔，ID:`, interval)
      return () => {
        console.log(`[useEffect] 清除檢查間隔，ID:`, interval)
        clearInterval(interval)
      }
    } else {
      console.log(`[useEffect] 條件不滿足，跳過設置檢查間隔`)
    }
  }, [state, transactionId]) // 移除 countdown 依賴項

  const handleOpenDoor = () => {
    startTransition(async () => {
      try {
        const result = await getDoorQRCode(initialProperty!.id, initialRoom!)
        setQrCodeValue(result.qrcodeImage)
        setTransactionId(result.transactionId)
        console.log('Received QR Code and Transaction ID:', result)
        setState("qrcode")
        setCountdown(COUNTDOWN_SECONDS)
      } catch (error) {
        console.error('Failed to get verification data:', error)
        handleError("unauthorized")
      }
    })
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
      setCountdown(COUNTDOWN_SECONDS)
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

  if (initialError || !initialProperty) {
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

  const progressPercentage = (countdown / COUNTDOWN_SECONDS) * 100

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
                <p className="text-sm text-[oklch(0.60_0.05_240)]">房號 {initialRoom}</p>
              </div>

              <Button
                onClick={handleOpenDoor}
                size="lg"
                disabled={isPending}
                className="h-32 w-32 rounded-full bg-gradient-to-br from-[oklch(0.75_0.15_45)] to-[oklch(0.65_0.15_35)] text-xl font-bold text-[oklch(0.15_0.03_260)] shadow-lg hover:scale-105 hover:shadow-[oklch(0.75_0.15_45)]/50 active:scale-95 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-8 w-8 animate-spin" /> : "開門"}
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
                  <img src={qrCodeValue} alt="QR Code" className="w-[200px] h-[200px]" />
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
                  <span className="relative z-10">{formatTime(countdown)}</span>
                </div>
              </div>

              <p className="text-sm text-[oklch(0.70_0.05_240)]">請使用 App 掃描此 QR Code 進行開門授權</p>

              <Button
                onClick={handleReset}
                variant="outline"
                className="mt-4 border-[oklch(0.45_0.08_240)] bg-transparent text-[oklch(0.70_0.05_240)] hover:bg-[oklch(0.45_0.08_240)]/20"
              >
                返回
              </Button>
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