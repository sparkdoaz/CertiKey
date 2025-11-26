'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'

export type UserRole = 'guest' | 'host'

// 生成短 ID 函數
function generateShortId(): string {
  // 以密碼學安全亂數產生 12 字符的隨機短 ID（大寫英數字）
  return randomBytes(12).toString('hex').substring(2, 14).toUpperCase();
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const name = formData.get('name') as string
  const role = (formData.get('role') as UserRole) || 'guest'

  console.log('📝 Server Action: 註冊請求', { email, name, role })

  // Server-side validation
  if (!name?.trim()) {
    return { error: '請輸入姓名' }
  }

  if (!email?.trim()) {
    return { error: '請輸入電子郵件' }
  }

  if (!password || password.length < 6) {
    return { error: '密碼至少需要 6 個字元' }
  }

  if (password !== confirmPassword) {
    return { error: '密碼不一致' }
  }

  // 1. 註冊 Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    console.error('❌ 註冊失敗:', authError)
    
    // 處理常見錯誤
    if (authError.message.includes('User already registered')) {
      return { error: '此電子郵件已被註冊' }
    } else if (authError.message.includes('Invalid email')) {
      return { error: '請輸入有效的電子郵件地址' }
    }
    
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: '註冊失敗，請稍後再試' }
  }

  console.log('✅ Auth 註冊成功，創建用戶檔案...')

  // 2. 創建用戶檔案
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email,
      name,
      role,
      short_id: generateShortId(),
    })

  if (profileError) {
    console.error('❌ 創建用戶檔案失敗:', profileError)
    return { error: '創建用戶檔案失敗' }
  }

  console.log('✅ 註冊成功，重定向...')
  revalidatePath('/', 'layout')
  
  // 根據角色重定向
  const redirectPath = role === 'host' ? '/host/dashboard' : '/properties'
  redirect(redirectPath)
}
