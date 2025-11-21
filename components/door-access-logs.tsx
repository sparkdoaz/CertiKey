"use client"

import { useState, useEffect } from "react"
import type { DoorAccessLog } from "@/types/door-access-log"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, Lock, LockOpen, AlertCircle, CheckCircle, Smartphone, MapPin } from "lucide-react"
// import { mockDoorAccessLogs } from "@/lib/mock-data" // 註解掉 mock 資料

interface DoorAccessLogsProps {
  bookingId: string
  viewMode?: "guest" | "host"
}

export function DoorAccessLogs({ bookingId, viewMode = "guest" }: DoorAccessLogsProps) {
  const [logs, setLogs] = useState<DoorAccessLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDoorAccessLogs() {
      try {
        setLoading(true)
 
        // 使用 API 路由獲取門禁記錄（繞過 RLS）
        const response = await fetch(`/api/door-access-logs?bookingId=${bookingId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch door access logs')
        }
        const data = await response.json()

        console.log('載入的開門記錄原始資料:', data)

        // 轉換資料格式
        const formattedLogs: DoorAccessLog[] = (data || []).map(log => ({
          id: log.id,
          bookingId: log.booking_id,
          userId: log.user_id,
          propertyId: log.booking?.id,
          timestamp: new Date(log.access_time),
          action: 'unlock', // 簡化，預設都是開門動作
          status: (log.status === 'denied' ? 'failed' : 'success') as "success" | "failed",
          failureReason: log.status === 'denied' ? '驗證失敗' : undefined,
          deviceInfo: log.transaction_id,
          location: undefined, // 移除，因為表中沒有這個欄位
          userName: log.user?.name || `用戶 ${log.user_id?.slice(0, 8)}` || '未知用戶',
          propertyTitle: log.booking?.property?.title || '未知房源'
        }))

        setLogs(formattedLogs)
      } catch (error) {
        console.error('載入開門紀錄失敗:', error)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    loadDoorAccessLogs()
  }, [bookingId])

  const formatTimestamp = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "剛剛"
    if (minutes < 60) return `${minutes} 分鐘前`
    if (hours < 24) return `${hours} 小時前`
    return `${days} 天前`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          開門紀錄
        </CardTitle>
        <CardDescription>{viewMode === "guest" ? "查看您的開門歷史紀錄" : "查看房客的開門歷史紀錄"}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">載入中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">尚無開門紀錄</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${log.status === "success"
                      ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                  >
                    {log.action === "unlock" ? <LockOpen className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{log.action === "unlock" ? "開門" : "關門"}</span>
                          <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">
                            {log.status === "success" ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                成功
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                失敗
                              </span>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{getRelativeTime(log.timestamp)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">開門者：</span>
                      <span className="font-medium">{log.userName}</span>
                    </div>

                    {log.failureReason && (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{log.failureReason}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {log.deviceInfo && (
                        <span className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          {log.deviceInfo}
                        </span>
                      )}
                      {log.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {log.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
