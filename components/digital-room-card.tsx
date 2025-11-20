"use client"

import { useEffect, useRef, useState } from "react"
import type { Booking } from "@/types/booking"
import type { CertificateResponse } from "@/types/digital-certificate"
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
import { Calendar, Users, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react"
import QRCode from "qrcode"
import { createClient } from "@/utils/supabase/client"

interface DigitalRoomCardProps {
  booking: Booking
}

export function DigitalRoomCard({ booking }: DigitalRoomCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean
    title: string
    description: string
    type: "expired" | "used" | "invalid" | "error" | null
  }>({
    open: false,
    title: "",
    description: "",
    type: null,
  })
  const [qrCodeStatus, setQrCodeStatus] = useState<"valid" | "used" | "expired" | "not-ready">("valid")

  // QR Code 倒數計時 (5 分鐘 = 300 秒)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [vcStatus, setVcStatus] = useState<"pending" | "claimed" | null>(null)

  // 用於存儲 timer 和 polling interval 的 ref
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 清理 timer 和 polling interval
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // 倒數計時 effect
  useEffect(() => {
    if (timeRemaining === null) return

    if (timeRemaining <= 0) {
      // 時間到,停止輪詢
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setTimeRemaining(null)

      // 如果還沒被掃描,顯示過期訊息
      if (vcStatus === 'pending') {
        setErrorDialog({
          open: true,
          title: "QR Code 已過期",
          description: "QR Code 5 分鐘有效期限已過,請重新領取房卡",
          type: "expired",
        })
        // 清空 QR Code
        setQrCodeData(null)
        setTransactionId(null)
        setVcStatus(null)
      }
      return
    }

    // 啟動倒數計時
    countdownTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return null
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [timeRemaining, vcStatus])

  // 查詢 VC 狀態
  const queryVcStatus = async (txId: string) => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        return
      }

      if (!session?.access_token) {
        console.log('No access token available')
        return
      }

      console.log('Making API call with token length:', session.access_token.length)

      const response = await fetch(`/api/digital-certificate/status/${txId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('VC Status:', result)

        // 檢查狀態
        if (result.status === 'claimed' || result.vc_status?.credential) {
          // 已被掃描!
          setVcStatus('claimed')

          // 停止輪詢和倒數
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          setTimeRemaining(null)

          // 顯示成功訊息
          setErrorDialog({
            open: true,
            title: "房卡已領取",
            description: "您的數位房卡已成功領取,可以在專屬 App 中查看並使用",
            type: "used",
          })
        }
      }
    } catch (error) {
      console.error('Failed to query VC status:', error)
    }
  }

  // 開始輪詢 VC 狀態
  const startPollingVcStatus = (txId: string) => {
    // 清除舊的 polling interval (如果有)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // 立即查詢一次
    queryVcStatus(txId)

    // 每 15 秒查詢一次
    pollingIntervalRef.current = setInterval(() => {
      queryVcStatus(txId)
    }, 15000) //todo
  }

  useEffect(() => {
    const checkQRCodeValidity = () => {
      const now = new Date()
      const checkInDate = new Date(booking.checkIn || booking.check_in_date)
      const checkOutDate = new Date(booking.checkOut || booking.check_out_date)

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

  // 領取房卡 - 調用 API 獲取 QR Code
  const handleClaimCard = async () => {
    setIsLoading(true)
    try {
      // 獲取當前用戶的 session token
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error("請先登入")
      }

      // 準備 API 請求數據 - 只傳送 booking ID，敏感資料由後端處理
      const requestData = {
        bookingId: booking.id
      }

      // 調用 API - 帶上 Authorization header 進行身份驗證
      const response = await fetch('/api/digital-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error)

        // 顯示詳細的錯誤訊息
        let errorMessage = error.message || '領取房卡失敗'

        // 如果有 details,附加到錯誤訊息中
        if (error.details) {
          if (Array.isArray(error.details)) {
            // 欄位驗證錯誤
            errorMessage += '\n\n' + error.details.join('\n')
          } else if (typeof error.details === 'object') {
            // 其他詳細錯誤
            errorMessage += '\n\n' + JSON.stringify(error.details, null, 2)
          }
        }

        throw new Error(errorMessage)
      }

      const data: CertificateResponse = await response.json()

      // 印出 transactionId
      console.log('Certificate Transaction ID:', data.transactionId)
      console.log('Full Response:', {
        transactionId: data.transactionId,
        hasQrCode: !!data.qrCode,
        hasDeepLink: !!data.deepLink,
        qrCodeLength: data.qrCode?.length,
        deepLinkLength: data.deepLink?.length
      })

      // 儲存 transactionId 以便後續查詢 VC 狀態
      setTransactionId(data.transactionId)

      // 保存 QR Code 數據
      // qrCode 是 Base64 圖片(已經生成好的),優先使用
      // deepLink 是純文字 URL,如果沒有 qrCode 才使用
      setQrCodeData(data.qrCode || data.deepLink)

      // 啟動 30 分鐘倒數計時
      setTimeRemaining(1800) // 1800 秒 = 30 分鐘
      setVcStatus('pending')

      // 開始輪詢 VC 狀態
      startPollingVcStatus(data.transactionId)

    } catch (error) {
      console.error('Failed to claim room card:', error)

      // 將錯誤訊息中的換行符號轉為 <br/>
      const errorMsg = error instanceof Error ? error.message : "領取房卡時發生錯誤，請稍後再試"

      setErrorDialog({
        open: true,
        title: "領取失敗",
        description: errorMsg,
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // API 已經回傳完整的 QR Code 圖片(Base64),不需要再次生成
  // 如果 qrCode 是 Base64 圖片,就直接使用;如果是 deepLink 純文字,則需要生成
  useEffect(() => {
    if (canvasRef.current && qrCodeData && qrCodeStatus === "valid") {
      // 檢查是否為 Base64 圖片 (data:image/ 開頭)
      if (qrCodeData.startsWith('data:image/')) {
        // 這是 Base64 圖片,直接顯示在 img 元素上
        console.log('QR Code is a Base64 image, no need to regenerate');
      } else {
        // 這是純文字 URL (deepLink),需要生成 QR Code
        console.log('Generating QR Code from text:', qrCodeData.substring(0, 100));
        QRCode.toCanvas(canvasRef.current, qrCodeData, {
          width: 256,
          margin: 2,
          errorCorrectionLevel: 'L',
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        }).catch(err => {
          console.error('Failed to generate QR code:', err);
          setErrorDialog({
            open: true,
            title: "QR Code 生成失敗",
            description: `無法生成 QR Code。請聯繫客服處理。`,
            type: "error",
          });
        })
      }
    }
  }, [qrCodeData, qrCodeStatus])

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

  // 格式化倒數時間
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-primary to-primary/80 overflow-hidden">
        <CardHeader className="text-primary-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">數位房卡</CardTitle>
            {getStatusBadge()}
          </div>
          <p className="text-center text-sm text-primary-foreground/90">
            {qrCodeStatus === "valid" ? "請使用專屬 App 掃描此 QR Code" : "此 QR Code 目前無法使用"}
          </p>
          {/* 倒數計時顯示 */}
          {timeRemaining !== null && vcStatus === 'pending' && (
            <div className="mt-2 text-center">
              <p className="text-xs text-primary-foreground/80">
                有效期限剩餘: <span className="font-mono font-semibold">{formatTimeRemaining(timeRemaining)}</span>
              </p>
            </div>
          )}
          {vcStatus === 'claimed' && (
            <div className="mt-2 text-center">
              <p className="text-xs text-green-200 font-medium">
                ✓ 房卡已成功領取
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="bg-white space-y-6 p-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="rounded-lg bg-white p-4 shadow-lg">
              {!qrCodeData ? (
                <div className="flex h-64 w-64 items-center justify-center bg-gray-50">
                  <div className="text-center space-y-4">
                    <Download className="mx-auto h-16 w-16 text-gray-400" />
                    <p className="text-sm text-gray-500">尚未領取房卡</p>
                    <Button
                      onClick={handleClaimCard}
                      disabled={isLoading || qrCodeStatus !== "valid"}
                      className="mt-2"
                    >
                      {isLoading ? "領取中..." : "領取房卡"}
                    </Button>
                  </div>
                </div>
              ) : qrCodeStatus === "valid" ? (
                qrCodeData.startsWith('data:image/') ? (
                  // Base64 圖片,直接顯示
                  <img
                    src={qrCodeData}
                    alt="Digital Room Card QR Code"
                    className="h-64 w-64"
                  />
                ) : (
                  // 純文字 URL,使用 Canvas 生成
                  <canvas ref={canvasRef} className="h-64 w-64" />
                )
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
                    {booking.checkIn && new Date(booking.checkIn).toLocaleString("zh-TW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">退房時間</p>
                  <p className="text-muted-foreground">
                    {booking.checkOut && new Date(booking.checkOut).toLocaleString("zh-TW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
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
            {!qrCodeData ? (
              <>
                <p className="font-medium">請點擊上方按鈕領取數位房卡</p>
                <p className="mt-1">領取後即可使用專屬 App 掃描 QR Code</p>
                <p className="mt-2 text-xs">QR Code 將於退房日期後自動失效</p>
              </>
            ) : qrCodeStatus === "valid" ? (
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
        </CardContent>
      </Card>

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {errorDialog.type === "used" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
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
