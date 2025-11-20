"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { Booking } from "@/types/booking"
import { DigitalRoomCard } from "@/components/digital-room-card"
import { DoorAccessLogs } from "@/components/door-access-logs"
import { SharedRoomCards } from "@/components/shared-room-cards"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

interface BookingDetailClientProps {
  booking: Booking
  userId: string
  userEmail: string
  isPrimaryGuest: boolean
}

export function BookingDetailClient({ booking, userId, userEmail, isPrimaryGuest }: BookingDetailClientProps) {
  // 獲取入住/退房日期
  const checkInDate = useMemo(() => {
    if (booking?.check_in_date) return new Date(booking.check_in_date)
    if (booking?.checkIn) return booking.checkIn instanceof Date ? booking.checkIn : new Date(booking.checkIn)
    return new Date()
  }, [booking?.check_in_date, booking?.checkIn])

  const checkOutDate = useMemo(() => {
    if (booking?.check_out_date) return new Date(booking.check_out_date)
    if (booking?.checkOut) return booking.checkOut instanceof Date ? booking.checkOut : new Date(booking.checkOut)
    return new Date()
  }, [booking?.check_out_date, booking?.checkOut])

  // 獲取房源名稱
  const propertyName = booking.property?.title || booking.propertyTitle || "房源"

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/bookings">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回訂單列表
          </Button>
        </Link>

        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-bold">{propertyName}</h1>
          {isPrimaryGuest ? (
            <Badge variant="default" className="bg-primary text-primary-foreground">
              主住者
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              同住者
            </Badge>
          )}
        </div>

        <div className="mb-6 text-sm text-muted-foreground">
          訂單建立時間：{new Date(booking.created_at).toLocaleString("zh-TW")}
        </div>

        <Tabs defaultValue="room-card" className="space-y-6">
          <TabsList className={`grid w-full ${isPrimaryGuest ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="room-card">數位房卡</TabsTrigger>
            {isPrimaryGuest && <TabsTrigger value="shared-cards">共享房卡管理</TabsTrigger>}
            <TabsTrigger value="access-logs">開門紀錄</TabsTrigger>
          </TabsList>

          <TabsContent value="room-card">
            <DigitalRoomCard booking={booking} />
          </TabsContent>

          {isPrimaryGuest && (
            <TabsContent value="shared-cards">
              <SharedRoomCards
                bookingId={booking.id}
                propertyName={propertyName}
                checkIn={checkInDate}
                checkOut={checkOutDate}
                userId={userId}
                userEmail={userEmail}
              />
            </TabsContent>
          )}

          <TabsContent value="access-logs">
            <DoorAccessLogs bookingId={booking.id} viewMode="guest" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
