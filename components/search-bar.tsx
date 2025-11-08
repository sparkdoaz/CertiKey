"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, MapPin, Calendar, Users } from "lucide-react"

interface SearchBarProps {
  onSearch?: (filters: any) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [location, setLocation] = useState("")
  const [guests, setGuests] = useState("2")

  const handleSearch = () => {
    onSearch?.({
      location,
      guests: Number.parseInt(guests),
    })
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              地點
            </Label>
            <Input
              id="location"
              placeholder="搜尋目的地"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkin" className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              入住日期
            </Label>
            <Input id="checkin" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout" className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              退房日期
            </Label>
            <Input id="checkout" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guests" className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              人數
            </Label>
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger id="guests">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 位</SelectItem>
                <SelectItem value="2">2 位</SelectItem>
                <SelectItem value="3">3 位</SelectItem>
                <SelectItem value="4">4 位</SelectItem>
                <SelectItem value="5">5 位</SelectItem>
                <SelectItem value="6">6 位以上</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSearch} className="mt-4 w-full gap-2 md:w-auto">
          <Search className="h-4 w-4" />
          搜尋
        </Button>
      </CardContent>
    </Card>
  )
}
