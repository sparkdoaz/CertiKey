import { notFound } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/server"
import { getProperty } from "@/lib/supabase-queries"
import { BookingForm } from "@/components/booking-form"
import { Separator } from "@/components/ui/separator"
import { Star, MapPin, Users, Bed, Bath, Wifi, Wind, Tv, Car } from "lucide-react"

const amenityIcons: Record<string, any> = {
  WiFi: Wifi,
  空調: Wind,
  電視: Tv,
  停車場: Car,
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = await getProperty(id)

  if (!property) {
    notFound()
  }

  // 檢查用戶是否登入 (不強制登入,只是傳遞資訊給 BookingForm)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold">{property.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-medium">{property.rating}</span>
              <span className="text-muted-foreground">({property.reviews} 則評價)</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {property.location}, {property.city}, {property.country}
              </span>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="mb-8 grid gap-2 md:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg md:aspect-auto md:row-span-2">
            <Image
              src={property.images[0] || "/placeholder.svg"}
              alt={property.title}
              fill
              className="object-cover"
              priority
            />
          </div>
          {(property.images || []).slice(1).map((image: string, index: number) => (
            <div key={index} className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src={image || "/placeholder.svg"}
                alt={`${property.title} - ${index + 2}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Host Info */}
            <div className="mb-6">
              <h2 className="mb-2 text-2xl font-semibold">
                由 {property.host?.name || '房東'} 出租的房源
              </h2>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{property.max_guests} 位房客</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  <span>{property.bedrooms} 間臥室</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  <span>{property.bathrooms} 間衛浴</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Description */}
            <div className="mb-6">
              <h3 className="mb-3 text-xl font-semibold">關於這個房源</h3>
              <p className="leading-relaxed text-muted-foreground">{property.description}</p>
            </div>

            <Separator className="my-6" />

            {/* Amenities */}
            <div className="mb-6">
              <h3 className="mb-4 text-xl font-semibold">設施與服務</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(property.amenities || []).map((amenity: string) => {
                  const Icon = amenityIcons[amenity]
                  return (
                    <div key={amenity} className="flex items-center gap-3">
                      {Icon ? <Icon className="h-5 w-5 text-muted-foreground" /> : <div className="h-5 w-5" />}
                      <span>{amenity}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-1">
            <BookingForm property={property} userId={user?.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
