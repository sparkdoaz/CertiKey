'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient()

  // 驗證用戶登入
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: '請先登入' }
  }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const nationalId = formData.get('nationalId') as string

  // 更新用戶檔案
  const { error } = await supabase
    .from('user_profiles')
    .update({
      name,
      phone: phone || null,
      national_id: nationalId || null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('❌ 更新用戶資料失敗:', error)
    return { error: '更新失敗,請稍後再試' }
  }

  console.log('✅ 用戶資料更新成功')
  revalidatePath('/profile')
  
  return { success: true, message: '資料已成功更新!' }
}

export async function updateDigitalVerification(nationalId: string) {
  const supabase = await createClient()

  // 驗證用戶登入
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: '請先登入' }
  }

  // 更新數位驗證資料
  const { error } = await supabase
    .from('user_profiles')
    .update({
      national_id: nationalId,
      national_id_verified: true,
    })
    .eq('id', user.id)

  if (error) {
    console.error('❌ 更新數位驗證失敗:', error)
    return { error: '數位驗證更新失敗,請稍後再試' }
  }

  console.log('✅ 數位驗證更新成功')
  revalidatePath('/profile')
  
  return { success: true, message: '數位驗證已成功完成!', nationalId }
}
