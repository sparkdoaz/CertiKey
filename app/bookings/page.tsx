"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import type { Booking } from "@/types/booking"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Calendar, Users, QrCode } from "lucide-react"

export default function BookingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const storedBookings = JSON.parse(localStorage.getItem("bookings") || "[]")
    const userBookings = storedBookings.filter((b: Booking) => b.userId === user.id)
    setBookings(userBookings)
  }, [user, router])

  if (!user) {
    return null
  }

  const getStatusBadge = (status: Booking["status"]) => {
    const variants = {
      pending: { label: "待確認", variant: "secondary" as const },
      confirmed: { label: "已確認", variant: "default" as const },
      cancelled: { label: "已取消", variant: "destructive" as const },
      completed: { label: "已完成", variant: "outline" as const },
    }
    return variants[status]
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-3xl font-bold">我的訂單</h1>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-muted-foreground">您還沒有任何訂單</p>
              <Link href="/properties">
                <Button>開始探索</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const statusInfo = getStatusBadge(booking.status)
              return (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-lg sm:w-48">
                        <Image
                          src={booking.propertyImage || "/placeholder.svg"}
                          alt={booking.propertyTitle}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="text-lg font-semibold">{booking.propertyTitle}</h3>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </div>

                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(booking.checkIn).toLocaleDateString("zh-TW")} -{" "}
                                {new Date(booking.checkOut).toLocaleDateString("zh-TW")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{booking.guests} 位房客</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">總金額</p>
                            <p className="text-xl font-bold">NT$ {booking.totalPrice.toLocaleString()}</p>
                          </div>

                          {booking.status === "confirmed" && (
                            <Link href={`/bookings/${booking.id}`}>
                              <Button className="gap-2">
                                <QrCode className="h-4 w-4" />
                                查看房卡
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
