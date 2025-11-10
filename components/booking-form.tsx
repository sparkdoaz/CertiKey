"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Property } from "@/types/property"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Users } from "lucide-react"

interface BookingFormProps {
  property: Property
}

export function BookingForm({ property }: BookingFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState("2")
  const [isLoading, setIsLoading] = useState(false)

  // 使用 useMemo 來創建今天的日期字符串，避免 hydration 錯誤
  const todayString = useMemo(() => new Date().toISOString().split("T")[0], [])

  // 確保 property 和 price 存在
  if (!property || (!property.price && !property.price_per_night)) {
    return (
      <Card className="sticky top-24">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>房源資料載入中...</p>
        </CardContent>
      </Card>
    )
  }

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diff = end.getTime() - start.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const nights = calculateNights()
  const pricePerNight = property.price || property.price_per_night || 0
  const subtotal = nights * pricePerNight
  const serviceFee = Math.round(subtotal * 0.1)
  const total = subtotal + serviceFee
  const maxGuests = property.guests || property.max_guests || 4

  const handleBooking = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!checkIn || !checkOut) {
      alert("請選擇入住和退房日期")
      return
    }

    setIsLoading(true)

    // 導航到付款頁面，通過 URL 參數傳遞預訂資訊
    const params = new URLSearchParams({
      propertyId: property.id,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests,
      totalPrice: total.toString()
    })

    router.push(`/payment?${params.toString()}`)
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          <span className="text-2xl">NT$ {pricePerNight.toLocaleString()}</span>
          <span className="text-base font-normal text-muted-foreground">/ 晚</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkIn" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              入住日期
            </Label>
            <Input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={todayString}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkOut" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              退房日期
            </Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || todayString}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              入住人數
            </Label>
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger id="guests">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} 位
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {nights > 0 && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  NT$ {pricePerNight.toLocaleString()} × {nights} 晚
                </span>
                <span>NT$ {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">服務費</span>
                <span>NT$ {serviceFee.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>總計</span>
                <span>NT$ {total.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}

        <Button onClick={handleBooking} disabled={isLoading || !checkIn || !checkOut} className="w-full" size="lg">
          {isLoading ? "處理中..." : user ? "預訂" : "登入後預訂"}
        </Button>

        {!user && <p className="text-center text-sm text-muted-foreground">需要登入才能預訂</p>}
      </CardContent>
    </Card>
  )
}
