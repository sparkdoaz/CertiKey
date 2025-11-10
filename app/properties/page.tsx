import { getProperties } from "@/lib/supabase-queries" // 使用 Supabase 查詢
import type { Property } from "@/types/property" // 使用更新的 Property 類型
import { PropertiesPageClient } from "./properties-page-client"

export default async function PropertiesPage() {
  let properties: Property[] = []
  let error: string | null = null

  try {
    console.log('🔍 開始載入房源資料...')
    const data = await getProperties()
    properties = data || []
  } catch (err) {
    console.error('❌ 載入房源失敗:', err)
    error = err instanceof Error ? err.message : '載入房源失敗'
  }

  return <PropertiesPageClient initialProperties={properties} error={error} />
}
