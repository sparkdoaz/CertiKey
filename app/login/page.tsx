"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { login, user, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [role, setRole] = useState<UserRole>("guest")

  // 如果用戶已經登入，重定向到對應頁面
  useEffect(() => {
    if (user && !authLoading) {
      console.log('👤 用戶已登入，重定向中...', user)
      const redirectPath = user.role === "host" ? "/host/dashboard" : "/properties"
      router.push(redirectPath)
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log('🔐 登入表單提交:', { email, role })

    try {
      console.log('📞 呼叫 login 函數...')
      await login(email, password, role)
      console.log('✅ 登入成功，準備重定向...')

      const redirectPath = role === "host" ? "/host/dashboard" : "/properties"
      console.log('🔄 重定向到:', redirectPath)
      router.push(redirectPath)
    } catch (err) {
      console.error('❌ 登入錯誤:', err)
      if (err instanceof Error) {
        // 根據錯誤訊息提供更友善的提示
        if (err.message.includes('超時')) {
          setError('連接超時，請檢查網路連接後重試')
        } else if (err.message.includes('用戶檔案不存在')) {
          setError('帳號資料異常，請重新註冊或聯絡管理員')
        } else if (err.message.includes('資料庫')) {
          setError('資料庫連接失敗，請稍後再試')
        } else {
          setError(err.message)
        }
      } else {
        setError("登入失敗，請檢查您的帳號密碼")
      }
    } finally {
      console.log('🏁 登入流程結束，設置 loading = false')
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
          <CardTitle className="text-2xl">歡迎回來</CardTitle>
          <CardDescription>登入您的 CertiKey 帳號</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="guest">消費者</TabsTrigger>
              <TabsTrigger value="host">房東</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input id="email" name="email" type="email" placeholder="your@email.com" required disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading || authLoading}>
              {isLoading ? "登入中..." : authLoading ? "載入中..." : "登入"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">還沒有帳號？</span>{" "}
            <Link href="/register" className="text-primary hover:underline">
              立即註冊
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
