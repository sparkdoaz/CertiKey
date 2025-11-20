"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default function NewPropertyForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    alert("房源已成功新增!")
    router.push("/host/dashboard")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">房源標題 *</Label>
        <Input id="title" name="title" placeholder="例如:台北市中心現代公寓" required disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">房源描述 *</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="詳細描述您的房源特色..."
          rows={4}
          required
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">房源類型 *</Label>
          <Select name="type" required disabled={isLoading}>
            <SelectTrigger id="type">
              <SelectValue placeholder="選擇類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">公寓</SelectItem>
              <SelectItem value="house">別墅</SelectItem>
              <SelectItem value="villa">豪華別墅</SelectItem>
              <SelectItem value="studio">工作室</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">每晚價格 (NT$) *</Label>
          <Input
            id="price"
            name="price"
            type="number"
            placeholder="2500"
            min="0"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">城市 *</Label>
          <Input id="city" name="city" placeholder="台北" required disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">地區 *</Label>
          <Input id="location" name="location" placeholder="信義區" required disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">國家 *</Label>
          <Input id="country" name="country" placeholder="台灣" required disabled={isLoading} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="bedrooms">臥室數量 *</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            placeholder="2"
            min="0"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bathrooms">衛浴數量 *</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            placeholder="1"
            min="0"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guests">可容納人數 *</Label>
          <Input
            id="guests"
            name="guests"
            type="number"
            placeholder="4"
            min="1"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amenities">設施與服務</Label>
        <Input
          id="amenities"
          name="amenities"
          placeholder="WiFi, 空調, 廚房, 洗衣機 (以逗號分隔)"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="images">房源圖片網址</Label>
        <Input
          id="images"
          name="images"
          placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">請輸入圖片網址,以逗號分隔</p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? "新增中..." : "新增房源"}
        </Button>
        <Link href="/host/dashboard" className="flex-1">
          <Button type="button" variant="outline" className="w-full bg-transparent" disabled={isLoading}>
            取消
          </Button>
        </Link>
      </div>
    </form>
  )
}
