"use client"

import type { Property } from "@/types/property"
import { SearchBar } from "@/components/search-bar"
import { PropertiesClient } from "./properties-client"

interface PropertiesPageClientProps {
  initialProperties: Property[]
  error?: string | null
}

export function PropertiesPageClient({ initialProperties, error }: PropertiesPageClientProps) {
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
          <PropertiesClient initialProperties={initialProperties} error={error} />
        </div>
      </section>
    </div>
  )
}
