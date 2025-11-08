"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import type { Booking } from "@/types/booking"
import { DigitalRoomCard } from "@/components/digital-room-card"
import { DoorAccessLogs } from "@/components/door-access-logs"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const bookings = JSON.parse(localStorage.getItem("bookings") || "[]")
    const foundBooking = bookings.find((b: Booking) => b.id === params.id && b.userId === user.id)

    if (foundBooking) {
      setBooking(foundBooking)
    } else {
      router.push("/bookings")
    }
  }, [user, router, params.id])

  if (!booking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/bookings">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回訂單列表
          </Button>
        </Link>

        <Tabs defaultValue="room-card" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="room-card">數位房卡</TabsTrigger>
            <TabsTrigger value="access-logs">開門紀錄</TabsTrigger>
          </TabsList>

          <TabsContent value="room-card">
            <DigitalRoomCard booking={booking} />
          </TabsContent>

          <TabsContent value="access-logs">
            <DoorAccessLogs bookingId={booking.id} viewMode="guest" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
