"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import type { Property } from "@/types/property"
import type { Booking } from "@/types/booking"
import { mockProperties } from "@/lib/mock-data"
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

export default function HostDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (user.role !== "host") {
      router.push("/")
      return
    }

    // Get host's properties
    const hostProperties = mockProperties.filter((p) => p.hostId === user.id)
    setProperties(hostProperties)

    // Get bookings for host's properties
    const allBookings = JSON.parse(localStorage.getItem("bookings") || "[]")
    const hostBookings = allBookings.filter((b: Booking) => hostProperties.some((p) => p.id === b.propertyId))
    setBookings(hostBookings)
  }, [user, router])

  if (!user || user.role !== "host") {
    return null
  }

  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0)
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">房東管理面板</h1>
            <p className="mt-1 text-muted-foreground">歡迎回來，{user.name}</p>
          </div>
          <Link href="/host/properties/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增房源
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總房源數</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{properties.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總預訂數</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已確認訂單</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmedBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總收入</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">NT$ {totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="properties" className="space-y-4">
          <TabsList>
            <TabsTrigger value="properties">我的房源</TabsTrigger>
            <TabsTrigger value="bookings">預訂記錄</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4">
            {properties.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Home className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-muted-foreground">您還沒有任何房源</p>
                  <Link href="/host/properties/new">
                    <Button>新增第一個房源</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                  <Card key={property.id}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                      <Image
                        src={property.images[0] || "/placeholder.svg"}
                        alt={property.title}
                        fill
                        className="object-cover"
                      />
                      <Badge className="absolute right-3 top-3">{property.available ? "上架中" : "已下架"}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="mb-2 font-semibold line-clamp-1">{property.title}</h3>
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{property.description}</p>
                      <div className="mb-3 text-lg font-bold">NT$ {property.price.toLocaleString()} / 晚</div>
                      <div className="flex gap-2">
                        <Link href={`/properties/${property.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                            <Eye className="h-4 w-4" />
                            查看
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                          <Edit className="h-4 w-4" />
                          編輯
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">還沒有任何預訂記錄</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const property = properties.find((p) => p.id === booking.propertyId)
                  return (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="relative h-24 w-full flex-shrink-0 overflow-hidden rounded-lg sm:w-32">
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
                                <div>
                                  <h3 className="font-semibold">{booking.propertyTitle}</h3>
                                  <p className="text-sm text-muted-foreground">訂單編號：{booking.id}</p>
                                </div>
                                <Badge
                                  variant={
                                    booking.status === "confirmed"
                                      ? "default"
                                      : booking.status === "cancelled"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {booking.status === "confirmed" && "已確認"}
                                  {booking.status === "pending" && "待確認"}
                                  {booking.status === "cancelled" && "已取消"}
                                  {booking.status === "completed" && "已完成"}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>房客：{booking.userName}</p>
                                <p>
                                  入住：{new Date(booking.checkIn).toLocaleDateString("zh-TW")} - 退房：
                                  {new Date(booking.checkOut).toLocaleDateString("zh-TW")}
                                </p>
                                <p>人數：{booking.guests} 位</p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-lg font-bold">NT$ {booking.totalPrice.toLocaleString()}</div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                                    <Clock className="h-4 w-4" />
                                    開門紀錄
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>{booking.propertyTitle}</DialogTitle>
                                    <DialogDescription>訂單編號：{booking.id}</DialogDescription>
                                  </DialogHeader>
                                  <DoorAccessLogs bookingId={booking.id} viewMode="host" />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
