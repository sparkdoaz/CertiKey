import Link from "next/link"
import Image from "next/image"
import type { Property } from "@/types/property" // 使用已更新的 Property 類型
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Users, Bed, Bath } from "lucide-react"

interface PropertyCardProps {
  property: Property
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={(property.images && property.images[0]) || "/placeholder.svg"}
            alt={property.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <Badge className="absolute right-3 top-3 bg-card text-card-foreground">
            {property.type === "apartment" && "公寓"}
            {property.type === "house" && "別墅"}
            {property.type === "villa" && "豪華別墅"}
            {property.type === "studio" && "工作室"}
          </Badge>
        </div>
        <CardContent className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-lg font-semibold">{property.title}</h3>
            {property.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-medium">{property.rating}</span>
                <span className="text-muted-foreground">({property.reviews})</span>
              </div>
            )}
          </div>

          <div className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {property.location ? `${property.location}, ${property.city}` : property.city}
            </span>
          </div>

          <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{property.max_guests || property.guests} 位</span>
            </div>
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms} 房</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms} 衛</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">NT$ {(property.price || property.price_per_night)?.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/ 晚</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
