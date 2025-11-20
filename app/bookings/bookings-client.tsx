"use client"

import { useState } from "react"
import Link from "next/link"
import type { Booking } from "@/types/booking"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Calendar, Users, QrCode, Home, Lock } from "lucide-react"

interface BookingsClientProps {
  initialBookings: Booking[]
  error?: string | null
}

export function BookingsClient({ initialBookings, error }: BookingsClientProps) {
  const [bookings] = useState<Booking[]>(initialBookings)

  const getStatusBadge = (status: Booking["status"]) => {
    const variants = {
      pending: { label: "待確認", variant: "secondary" as const },
      confirmed: { label: "已確認", variant: "default" as const },
      cancelled: { label: "已取消", variant: "destructive" as const },
      completed: { label: "已完成", variant: "outline" as const },
    }

    const { label, variant } = variants[status] || variants.pending
    return <Badge variant={variant}>{label}</Badge>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">載入訂單時發生錯誤: {error}</p>
        <p className="text-muted-foreground mt-2">請重新整理頁面或稍後再試</p>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">還沒有訂單</h2>
        <p className="mt-2 text-muted-foreground">
          開始探索精彩的住宿體驗吧！
        </p>
        <Button asChild className="mt-4">
          <Link href="/properties">瀏覽房源</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {bookings.map((booking) => (
        <Card key={booking.id} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Property Image */}
              <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-32">
                <Image
                  src={booking.propertyImage || "/placeholder-property.jpg"}
                  alt={booking.propertyTitle || "房源"}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Booking Details */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold">{booking.propertyTitle}</h3>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString("zh-TW") : "未設定"} - {" "}
                          {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString("zh-TW") : "未設定"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        <span>房號: {booking.room_number || "未分配"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{booking.guests} 位住客</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>建立時間: {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("zh-TW") : "未知"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold">
                      NT$ {booking.totalPrice?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/smart-door-demo?bookingId=${booking.id}`}>
                        <Lock className="mr-2 h-4 w-4" />
                        測試 門鎖測試Demo
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/bookings/${booking.id}`}>
                        <QrCode className="mr-2 h-4 w-4" />
                        查看詳情
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}