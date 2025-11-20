// app/components/navbar.tsx
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/utils/supabase/server"
import { signOut } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User as UserIcon, LayoutDashboard, CreditCard, DoorOpen } from "lucide-react"

export async function Navbar() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()
    if (data) {
      profile = {
        ...user,
        name: data.name || user.email?.split("@")[0],
        role: data.role || "guest",
      }
    }
  }

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/certikey-logo.png" alt="CertiKey" width={40} height={40} className="h-10 w-10" />
            <span className="text-xl font-semibold">CertiKey</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/smart-door-demo">
              <Button variant="ghost" size="sm">
                <DoorOpen className="mr-2 h-4 w-4" />
                智慧門鎖 Demo
              </Button>
            </Link>

            {profile ? (
              <>
                {profile.role === "host" && (
                  <Link href="/host/dashboard">
                    <Button variant="ghost" size="sm">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      管理面板
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <UserIcon className="h-4 w-4" />
                      <span>{profile.name}</span>
                      <Badge
                        variant={profile.role === "host" ? "default" : "secondary"}
                        className="ml-1"
                      >
                        {profile.role === "host" ? "房東" : "房客"}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">個人資料</Link>
                    </DropdownMenuItem>
                    {profile.role === "guest" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/bookings">我的訂單</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/membership-card" className="flex items-center">
                            <CreditCard className="mr-2 h-4 w-4" />
                            數位憑證會員卡申請
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <form action={signOut}>
                        <button type="submit" className="w-full text-left text-destructive">
                          登出
                        </button>
                      </form>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    登入
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">註冊</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
