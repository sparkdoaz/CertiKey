'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { UserRole } from "@/types/user-role"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = (formData.get('role') as UserRole) || 'guest'

  console.log('🔐 Server Action: 登入請求', { email, role })

  // 1. 登入 Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    console.error('❌ 登入失敗:', authError)
    return { error: authError.message }
  }

  console.log('✅ Auth 登入成功，檢查用戶檔案...')

  // 2. 檢查用戶檔案是否存在
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    console.error('❌ 用戶檔案不存在:', profileError)
    await supabase.auth.signOut()
    return { error: '用戶檔案不存在，請重新註冊' }
  }

  // 3. 更新用戶角色
  if (profile.role !== role) {
    console.log(`🔄 更新用戶角色: ${profile.role} -> ${role}`)
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', authData.user.id)

    if (updateError) {
      console.error('❌ 更新角色失敗:', updateError)
      return { error: '更新角色失敗' }
    }
  }

  console.log('✅ 登入成功，重定向...')
  revalidatePath('/', 'layout')
  
  // 根據角色重定向
  const redirectPath = role === 'host' ? '/host/dashboard' : '/properties'
  redirect(redirectPath)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const role = (formData.get('role') as UserRole) || 'guest'

  console.log('📝 Server Action: 註冊請求', { email, name, role })

  // 1. 註冊 Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    console.error('❌ 註冊失敗:', authError)
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
    })

  if (profileError) {
    console.error('❌ 創建用戶檔案失敗:', profileError)
    // 如果創建檔案失敗，刪除 auth 用戶
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: '創建用戶檔案失敗' }
  }

  console.log('✅ 註冊成功，重定向...')
  revalidatePath('/', 'layout')
  
  // 根據角色重定向
  const redirectPath = role === 'host' ? '/host/dashboard' : '/properties'
  redirect(redirectPath)
}