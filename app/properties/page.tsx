"use client"

import { useState } from "react"
import { mockProperties } from "@/lib/mock-data"
import { PropertyCard } from "@/components/property-card"
import { SearchBar } from "@/components/search-bar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SlidersHorizontal } from "lucide-react"

export default function PropertiesPage() {
  const [properties] = useState(mockProperties)
  const [sortBy, setSortBy] = useState("recommended")

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Search Section */}
      <section className="border-b bg-card px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-3xl font-bold">探索房源</h1>
          <SearchBar />
        </div>
      </section>

      {/* Results Section */}
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
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
        </div>
      </section>
    </div>
  )
}
