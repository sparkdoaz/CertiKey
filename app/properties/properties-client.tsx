"use client"

import { useState, useMemo } from "react"
import type { Property } from "@/types/property"
import { PropertyCard } from "@/components/property-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SlidersHorizontal } from "lucide-react"

interface PropertiesClientProps {
  initialProperties: Property[]
  error?: string | null
}

export function PropertiesClient({ initialProperties, error }: PropertiesClientProps) {
  const [sortBy, setSortBy] = useState("recommended")
  
  const properties = useMemo(() => {
    const sorted = [...initialProperties]
    
    switch (sortBy) {
      case "price-low":
        return sorted.sort((a, b) => (a.price_per_night || a.price || 0) - (b.price_per_night || b.price || 0))
      case "price-high":
        return sorted.sort((a, b) => (b.price_per_night || b.price || 0) - (a.price_per_night || a.price || 0))
      case "rating":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      case "recommended":
      default:
        return sorted
    }
  }, [initialProperties, sortBy])

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">載入房源時發生錯誤: {error}</p>
        <p className="text-muted-foreground mt-2">請重新整理頁面或稍後再試</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          找到 <span className="font-semibold text-foreground">{properties.length}</span> 個房源
        </p>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">推薦排序</SelectItem>
              <SelectItem value="price-low">價格：低到高</SelectItem>
              <SelectItem value="price-high">價格：高到低</SelectItem>
              <SelectItem value="rating">評分最高</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </>
  )
}