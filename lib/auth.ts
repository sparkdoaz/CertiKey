import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * ============================================
 * CertiKey 認證架構說明
 * ============================================
 * 
 * 1. middleware.ts (第一層防護)
 *    - 在每個請求前執行
 *    - 刷新 Supabase session
 *    - 未登入用戶訪問受保護路由 → 重定向到 /login
 * 
 * 2. lib/auth.ts (第二層防護 - 本檔案)
 *    - 在 Server Component 中使用
 *    - 提供類型安全的 user 物件
 *    - 處理 session 過期等邊緣情況
 *    - 提供方便的 helper 函數
 * 
 * 3. utils/supabase/server.ts (底層)
 *    - 建立 Supabase 客戶端
 *    - 處理 cookies 讀寫
 */

/**
 * Server-side 驗證用戶身份
 * 如果未登入則重定向到登入頁
 * 
 * @returns { user, supabase } 用戶資訊和 Supabase 客戶端
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    console.log('⚠️ requireAuth: 用戶未登入或 session 過期,重定向到登入頁')
    redirect('/login')
  }

  return { user, supabase }
}

/**
 * Server-side 取得用戶資訊 (包含 user_profiles)
 * 如果未登入則重定向到登入頁
 * 
 * @returns { user, profile, supabase }
 */
export async function requireAuthWithProfile() {
  const { user, supabase } = await requireAuth()

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('❌ 用戶檔案不存在:', error)
    redirect('/login')
  }

  return {
    user,
    profile: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as 'guest' | 'host',
      phone: profile.phone,
      nationalId: profile.national_id,
      nationalIdVerified: profile.national_id_verified,
    },
    supabase,
  }
}

/**
 * Server-side 檢查用戶是否為房東
 * 如果不是則重定向
 */
export async function requireHost() {
  const { profile, user, supabase } = await requireAuthWithProfile()

  if (profile.role !== 'host') {
    redirect('/properties')
  }

  return { user, profile, supabase }
}
