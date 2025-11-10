"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DigitalIdVerification } from "@/components/digital-id-verification"
import { User, Phone, CreditCard, CheckCircle2, Shield } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showDigitalVerification, setShowDigitalVerification] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nationalId: "",
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Load user data
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      nationalId: user.nationalId || "",
    })
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert('用戶資料不存在，請重新登入')
      router.push("/login")
      return
    }

    setIsLoading(true)

    try {
      // 使用 AuthContext 的 updateProfile 方法更新用戶資料
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        nationalId: formData.nationalId,
      })

      alert('資料已成功更新！')

    } catch (error) {
      console.error('更新用戶資料時發生錯誤:', error)
      alert('更新失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDigitalVerification = async (nationalId: string) => {
    if (!user) {
      alert('用戶資料不存在，請重新登入')
      router.push("/login")
      return
    }

    setFormData((prev) => ({ ...prev, nationalId }))
    setShowDigitalVerification(false)

    try {
      // 使用 AuthContext 的 updateProfile 方法更新數位驗證資料
      await updateProfile({
        nationalId,
        nationalIdVerified: true,
      })

      alert('數位驗證已成功完成！')

    } catch (error) {
      console.error('更新數位驗證資料時發生錯誤:', error)
      alert('數位驗證更新失敗，請稍後再試')
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    )
  }

  if (showDigitalVerification) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <DigitalIdVerification
          onVerified={handleDigitalVerification}
          onCancel={() => setShowDigitalVerification(false)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">個人資料</h1>
        <p className="text-muted-foreground">管理您的帳戶資訊和身分驗證</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>基本資料</CardTitle>
              <CardDescription>更新您的個人資訊</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="請輸入姓名"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">電子郵件</Label>
                  <Input id="email" type="email" value={formData.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">電子郵件無法修改</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">電話號碼</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="請輸入電話號碼"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalId">身分證字號</Label>
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">手動填寫</TabsTrigger>
                      <TabsTrigger value="digital">數位憑證驗證</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="space-y-2">
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nationalId"
                          type="text"
                          placeholder="請輸入身分證字號"
                          value={formData.nationalId}
                          onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                          className="pl-10"
                          maxLength={10}
                          required
                        />
                      </div>
                      {user.nationalIdVerified && formData.nationalId && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          已通過數位憑證驗證
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="digital" className="space-y-4">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="mt-0.5 h-5 w-5 text-primary" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium">使用數位憑證驗證</p>
                            <p className="text-xs text-muted-foreground">
                              透過數位憑證 App 掃描 QR Code，快速完成身分驗證
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowDigitalVerification(true)}
                        className="w-full"
                        variant="outline"
                      >
                        開始數位憑證驗證
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "儲存中..." : "儲存變更"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">帳戶狀態</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">電子郵件</span>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  已驗證
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">電話號碼</span>
                {user.phone ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    已填寫
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">未填寫</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">身分驗證</span>
                {user.nationalIdVerified ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    已驗證
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">未驗證</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">為什麼需要驗證？</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>完成身分驗證可以：</p>
              <ul className="space-y-1 pl-4">
                <li>• 提升帳戶安全性</li>
                <li>• 獲得更多預訂優惠</li>
                <li>• 加快入住流程</li>
                <li>• 建立信任度</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
