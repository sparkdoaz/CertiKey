"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { login } from "./actions"
import type { UserRole } from "@/types/user-role"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "登入中..." : "登入"}
    </Button>
  )
}

export default function LoginForm() {
  const [role, setRole] = useState<UserRole>("guest")
  const [error, setError] = useState<string>("")

  const handleSubmit = async (formData: FormData) => {
    setError("")

    // 添加角色到 formData
    formData.append("role", role)

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
    }
    // 如果成功,會自動重定向
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

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <SubmitButton />
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">還沒有帳號?</span>{" "}
            <Link href="/register" className="text-primary hover:underline">
              立即註冊
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
