"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { updateUserProfile, updateDigitalVerification } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DigitalIdVerification } from "@/components/digital-id-verification"
import { User, Phone, CreditCard, CheckCircle2, Shield } from "lucide-react"

interface ProfileFormProps {
  initialData: {
    name: string
    email: string
    phone: string
    nationalId: string
    nationalIdVerified: boolean
  }
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "儲存中..." : "儲存變更"}
    </Button>
  )
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [showDigitalVerification, setShowDigitalVerification] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [formData, setFormData] = useState(initialData)

  const handleSubmit = async (data: FormData) => {
    setMessage("")
    setError("")

    const result = await updateUserProfile(data)

    if (result.error) {
      setError(result.error)
    } else if (result.success) {
      setMessage(result.message!)
      // 更新本地狀態
      setFormData({
        ...formData,
        name: data.get('name') as string,
        phone: data.get('phone') as string,
        nationalId: data.get('nationalId') as string,
      })
    }
  }

  const handleDigitalVerification = async (nationalId: string) => {
    setMessage("")
    setError("")
    setShowDigitalVerification(false)

    const result = await updateDigitalVerification(nationalId)

    if (result.error) {
      setError(result.error)
    } else if (result.success) {
      setMessage(result.message!)
      setFormData((prev) => ({
        ...prev,
        nationalId: result.nationalId!,
        nationalIdVerified: true,
      }))
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">個人資料</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">基本資料</TabsTrigger>
            <TabsTrigger value="security">安全設定</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>個人資訊</CardTitle>
                <CardDescription>更新您的個人資料</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      姓名
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={formData.name}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      電子郵件
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">電子郵件無法修改</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      手機號碼
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="0912345678"
                      defaultValue={formData.phone}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationalId" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      身分證字號
                      {formData.nationalIdVerified && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </Label>
                    <Input
                      id="nationalId"
                      name="nationalId"
                      placeholder="A123456789"
                      defaultValue={formData.nationalId}
                      disabled={formData.nationalIdVerified}
                      className={formData.nationalIdVerified ? "bg-muted" : ""}
                    />
                    {formData.nationalIdVerified && (
                      <p className="text-xs text-green-600">已通過數位身分驗證</p>
                    )}
                  </div>

                  {message && (
                    <div className="rounded-md bg-green-50 p-3">
                      <p className="text-sm text-green-800">{message}</p>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <SubmitButton />
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>數位身分驗證</CardTitle>
                <CardDescription>使用台灣數位身分錢包 (TW DIW) 驗證您的身分</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.nationalIdVerified ? (
                  <div className="rounded-lg bg-green-50 p-6 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
                    <h3 className="mb-2 text-lg font-semibold text-green-900">已完成驗證</h3>
                    <p className="text-sm text-green-700">您的身分已通過數位身分錢包驗證</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-muted bg-card p-6">
                      <div className="mb-4 flex items-start gap-3">
                        <Shield className="h-6 w-6 flex-shrink-0 text-primary" />
                        <div>
                          <h3 className="mb-2 font-semibold">為什麼需要驗證？</h3>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• 提升帳號安全性</li>
                            <li>• 使用數位憑證功能</li>
                            <li>• 快速辦理會員卡</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setShowDigitalVerification(true)}
                      className="w-full"
                      size="lg"
                    >
                      開始驗證
                    </Button>
                  </>
                )}

                {showDigitalVerification && (
                  <DigitalIdVerification
                    onVerified={handleDigitalVerification}
                    onCancel={() => setShowDigitalVerification(false)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
