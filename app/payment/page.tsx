"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Booking } from "@/types/booking"
import { PaymentForm } from "@/components/payment-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { Calendar, Users } from "lucide-react"

export default function PaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const pendingBooking = localStorage.getItem("pendingBooking")
    if (!pendingBooking) {
      router.push("/properties")
      return
    }

    setBooking(JSON.parse(pendingBooking))
  }, [user, router])

  const handlePaymentSuccess = (bookingId: string) => {
    if (!booking) return

    const confirmedBooking = {
      ...booking,
      id: bookingId,
      status: "confirmed",
    }

    // Store confirmed booking
    const existingBookings = JSON.parse(localStorage.getItem("bookings") || "[]")
    localStorage.setItem("bookings", JSON.stringify([...existingBookings, confirmedBooking]))
    localStorage.removeItem("pendingBooking")

    router.push(`/payment/success?bookingId=${bookingId}`)
  }

  if (!booking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    )
  }

  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24),
  )
  const subtotal = booking.totalPrice - Math.round(booking.totalPrice * 0.1)
  const serviceFee = Math.round(booking.totalPrice * 0.1)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-3xl font-bold">確認並付款</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Booking Summary */}
          <div className="lg:col-span-2">
            <PaymentForm totalAmount={booking.totalPrice} onSuccess={handlePaymentSuccess} />
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>訂單摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={booking.propertyImage || "/placeholder.svg"}
                      alt={booking.propertyTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-2">{booking.propertyTitle}</h3>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(booking.checkIn).toLocaleDateString("zh-TW")} -{" "}
                      {new Date(booking.checkOut).toLocaleDateString("zh-TW")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{booking.guests} 位房客</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">住宿費用 × {nights} 晚</span>
                    <span>NT$ {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">服務費</span>
                    <span>NT$ {serviceFee.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>總計</span>
                    <span>NT$ {booking.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
