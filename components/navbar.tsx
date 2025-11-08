"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, LayoutDashboard, CreditCard, RefreshCw, DoorOpen } from "lucide-react"

export function Navbar() {
  const { user, logout, switchRole } = useAuth()
  const pathname = usePathname()

  const handleSwitchRole = () => {
    const newRole = user?.role === "guest" ? "host" : "guest"
    switchRole(newRole)
  }

  const getRoleBadgeVariant = () => {
    return user?.role === "host" ? "default" : "secondary"
  }

  const getRoleLabel = () => {
    return user?.role === "host" ? "房東" : "房客"
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
            {/* </CHANGE> */}

            {user ? (
              <>
                {user.role === "host" && (
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
                      <User className="h-4 w-4" />
                      <span>{user.name}</span>
                      <Badge variant={getRoleBadgeVariant()} className="ml-1">
                        {getRoleLabel()}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleSwitchRole} className="cursor-pointer">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      切換為{user.role === "guest" ? "房東" : "房客"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">個人資料</Link>
                    </DropdownMenuItem>
                    {user.role === "guest" && (
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
                    {user.role === "host" && (
                      <DropdownMenuItem asChild>
                        <Link href="/host/dashboard">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          房東管理面板
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      登出
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant={pathname === "/login" ? "default" : "outline"} size="sm">
                    登入
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant={pathname === "/register" ? "default" : "outline"} size="sm">
                    註冊
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
