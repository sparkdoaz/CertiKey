"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [role, setRole] = useState<UserRole>("guest")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // 客戶端驗證
    if (!name.trim()) {
      setError("請輸入姓名")
      setIsLoading(false)
      return
    }

    if (!email.trim()) {
      setError("請輸入電子郵件")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("密碼至少需要 6 個字元")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("密碼不一致")
      setIsLoading(false)
      return
    }

    try {
      await register(email, password, name, role)

      // 註冊成功處理
      setSuccess("註冊成功！請檢查您的電子郵件以確認帳號")

      // 延遲跳轉讓用戶看到成功訊息
      setTimeout(() => {
        // 如果是已確認的用戶，直接跳轉到對應頁面
        // 否則跳轉到登入頁面
        router.push("/login")
      }, 2000)

    } catch (err) {
      console.error('Registration error:', err)

      if (err instanceof Error) {
        // 處理常見的 Supabase 錯誤
        if (err.message.includes('User already registered')) {
          setError("此電子郵件已被註冊，請使用其他電子郵件或直接登入")
        } else if (err.message.includes('Invalid email')) {
          setError("請輸入有效的電子郵件地址")
        } else if (err.message.includes('Password')) {
          setError("密碼格式不正確，請確保至少 6 個字元")
        } else {
          setError(err.message || "註冊失敗，請稍後再試")
        }
      } else {
        setError("註冊失敗，請稍後再試")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">加入 CertiKey</CardTitle>
          <CardDescription>創建您的帳號，開始探索</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label className="text-base font-medium">選擇您的身份</Label>
            <p className="text-sm text-muted-foreground mb-3">您可以稍後在個人設定中變更</p>
            <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="guest" disabled={isLoading || !!success}>
                  消費者
                </TabsTrigger>
                <TabsTrigger value="host" disabled={isLoading || !!success}>
                  房東
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="請輸入您的真實姓名"
                required
                disabled={isLoading || !!success}
                minLength={2}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                required
                disabled={isLoading || !!success}
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}(\.[a-z]{2,})?$"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="至少 6 個字元"
                required
                disabled={isLoading || !!success}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">密碼至少需要 6 個字元</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認密碼</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="再次輸入密碼"
                required
                disabled={isLoading || !!success}
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !!success}>
              {isLoading ? "註冊中..." : success ? "註冊成功" : "註冊"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">已經有帳號了？</span>{" "}
            <Link href="/login" className="text-primary hover:underline">
              立即登入
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
