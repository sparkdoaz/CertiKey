"use client"

import { useState } from "react"
import Link from "next/link"
import type { Property } from "@/types/property"
import type { Booking } from "@/types/booking"
import { DoorAccessLogs } from "@/components/door-access-logs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Image from "next/image"
import { Home, Calendar, DollarSign, Users, Plus, Eye, Edit, Clock } from "lucide-react"

interface HostDashboardClientProps {
  initialProperties: Property[]
  initialBookings: Booking[]
  error?: string | null
}

export function HostDashboardClient({ initialProperties, initialBookings, error }: HostDashboardClientProps) {
  const [properties] = useState<Property[]>(initialProperties)
  const [bookings] = useState<Booking[]>(initialBookings)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">載入房東資料時發生錯誤: {error}</p>
        <p className="text-muted-foreground mt-2">請重新整理頁面或稍後再試</p>
      </div>
    )
  }

  const totalRevenue = bookings
    .filter(b => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, booking) => sum + (booking.totalPrice || 0), 0)

  const thisMonthBookings = bookings.filter(booking => {
    const bookingDate = booking.createdAt ? new Date(booking.createdAt) : new Date()
    const now = new Date()
    return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()
  })

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總房源</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本月訂單</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthBookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總收益</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">NT$ {totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總訂單</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="properties" className="space-y-4">
        <TabsList>
          <TabsTrigger value="properties">房源管理</TabsTrigger>
          <TabsTrigger value="bookings">訂單管理</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">我的房源</h2>
            <Button asChild>
              <Link href="/host/properties/new">
                <Plus className="mr-2 h-4 w-4" />
                新增房源
              </Link>
            </Button>
          </div>

          {properties.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">還沒有房源</h3>
                <p className="text-muted-foreground mb-4">開始新增您的第一個房源吧！</p>
                <Button asChild>
                  <Link href="/host/properties/new">新增房源</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <Card key={property.id}>
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <Image
                      src={property.images?.[0] || "/placeholder-property.jpg"}
                      alt={property.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{property.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{property.location || property.address}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">NT$ {(property.price || property.price_per_night || 0).toLocaleString()}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/properties/${property.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <h2 className="text-2xl font-bold">訂單管理</h2>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">還沒有訂單</h3>
                <p className="text-muted-foreground">當有客人預訂您的房源時，訂單會顯示在這裡。</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{booking.propertyTitle}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            入住：{booking.checkIn ? new Date(booking.checkIn).toLocaleDateString("zh-TW") : "未設定"} - 退房：
                            {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString("zh-TW") : "未設定"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {booking.guests} 位住客
                          </div>
                        </div>
                        <div className="text-lg font-bold">NT$ {(booking.totalPrice || 0).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{booking.status}</Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBookingId(booking.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>門禁記錄</DialogTitle>
                              <DialogDescription>
                                查看此訂單的門禁存取記錄
                              </DialogDescription>
                            </DialogHeader>
                            {selectedBookingId && (
                              <DoorAccessLogs bookingId={selectedBookingId} viewMode="host" />
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}