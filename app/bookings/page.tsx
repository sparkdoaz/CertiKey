"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import type { Booking } from "@/types/booking"
import { BookingsClient } from "./bookings-client"

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) {
        setError('請先登入')
        setIsLoading(false)
        return
      }

      try {
        console.log('🔍 開始載入用戶訂單資料...', user.id)

        // 呼叫內部 API 來獲取當前用戶的訂單資料
        const response = await fetch(`/api/bookings?userId=${user.id}`, {
          cache: 'no-store', // 確保每次都獲取最新資料
        })

        if (!response.ok) {
          throw new Error(`API 請求失敗: ${response.status}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || '載入訂單失敗')
        }

        console.log(`✅ 成功載入 ${result.count} 筆訂單`)
        console.log('📋 訂單資料:', result.data.map((b: any) => ({ id: b.id, status: b.status, property: b.propertyTitle })))

        setBookings(result.data)
        setError(null)
      } catch (err) {
        console.error('❌ 載入訂單失敗:', err)
        setError(err instanceof Error ? err.message : '載入訂單失敗')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-bold">我的訂單</h1>
          <div className="text-center py-12">
            <p>載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">我的訂單</h1>
        <BookingsClient initialBookings={bookings} error={error} />
      </div>
    </div>
  )
}