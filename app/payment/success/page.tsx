"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import type { Booking } from "@/types/booking"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Calendar, Users, Home } from "lucide-react"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const bookingId = searchParams.get("bookingId")
    if (!bookingId) {
      router.push("/properties")
      return
    }

    const bookings = JSON.parse(localStorage.getItem("bookings") || "[]")
    const foundBooking = bookings.find((b: Booking) => b.id === bookingId)

    if (foundBooking) {
      setBooking(foundBooking)
    } else {
      router.push("/properties")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!booking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">付款成功！</CardTitle>
          <p className="text-muted-foreground">您的預訂已確認</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-secondary/50 p-6">
            <h3 className="mb-4 font-semibold">預訂詳情</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Home className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{booking.propertyTitle}</p>
                  <p className="text-sm text-muted-foreground">訂單編號：{booking.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm">
                  <p>
                    入住：
                    {new Date(booking.checkIn).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p>
                    退房：
                    {new Date(booking.checkOut).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm">{booking.guests} 位房客</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">確認信已寄送至您的電子郵件</p>
            <p className="mt-1 text-sm font-medium">數位房卡將在入住當天提供</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/bookings/${booking.id}`} className="flex-1">
              <Button className="w-full" size="lg">
                查看數位房卡
              </Button>
            </Link>
            <Link href="/properties" className="flex-1">
              <Button variant="outline" className="w-full bg-transparent" size="lg">
                繼續探索
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
