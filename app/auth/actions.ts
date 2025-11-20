'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()

  console.log('🚪 執行登出...')
  
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('❌ 登出失敗:', error)
    redirect('/error')
  }
  console.log('✅ 登出成功')
  revalidatePath('/', 'layout')
  redirect('/login')
}
