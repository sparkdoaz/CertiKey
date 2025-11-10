"use client"

import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, QrCode } from "lucide-react"

interface DigitalIdVerificationProps {
  onVerified: (nationalId: string) => void
  onCancel: () => void
}

export function DigitalIdVerification({ onVerified, onCancel }: DigitalIdVerificationProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [verificationId, setVerificationId] = useState<string>("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    // Generate verification ID with a more stable approach
    const id = `verify-${crypto.randomUUID()}`
    setVerificationId(id)

    // Generate QR code with verification URL
    const verificationUrl = `${window.location.origin}/api/verify-id?id=${id}`
    QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        setQrCodeUrl(url)
      })
      .catch((err) => {
        console.error("Error generating QR code:", err)
      })

    // Start polling for verification status
    setIsVerifying(true)
    const pollInterval = setInterval(() => {
      // Check if verification is complete
      const verificationData = localStorage.getItem(`verification-${id}`)
      if (verificationData) {
        const data = JSON.parse(verificationData)
        if (data.verified) {
          setIsVerified(true)
          setIsVerifying(false)
          clearInterval(pollInterval)
          // Simulate receiving national ID from verification
          setTimeout(() => {
            onVerified(data.nationalId)
            localStorage.removeItem(`verification-${id}`)
          }, 1500)
        }
      }
    }, 2000)

    // Cleanup
    return () => {
      clearInterval(pollInterval)
    }
  }, [onVerified])

  // Simulate verification for demo purposes
  const simulateVerification = () => {
    const mockNationalId = "A123456789"
    localStorage.setItem(
      `verification-${verificationId}`,
      JSON.stringify({
        verified: true,
        nationalId: mockNationalId,
      }),
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          數位憑證驗證
        </CardTitle>
        <CardDescription>請使用您的數位憑證 App 掃描 QR Code 進行身分驗證</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isVerified ? (
          <>
            <div className="flex justify-center">
              {qrCodeUrl ? (
                <div className="rounded-lg border-4 border-primary/20 p-4">
                  <img src={qrCodeUrl || "/placeholder.svg"} alt="Verification QR Code" className="h-64 w-64" />
                </div>
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-lg border-4 border-dashed border-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                等待驗證中...
              </div>
            )}

            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">驗證步驟：</p>
              <ol className="space-y-1 text-sm text-muted-foreground">
                <li>1. 開啟您的數位憑證 App</li>
                <li>2. 掃描上方 QR Code</li>
                <li>3. 確認身分驗證請求</li>
                <li>4. 等待驗證完成</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
                取消
              </Button>
              {/* Demo button to simulate verification */}
              <Button onClick={simulateVerification} variant="secondary" className="flex-1">
                模擬驗證（測試用）
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">驗證成功！</h3>
              <p className="text-sm text-muted-foreground">正在更新您的個人資料...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
