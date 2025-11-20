"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  nationalId?: string
  nationalIdVerified?: boolean
  role?: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // 獲取用戶檔案
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile({
            id: profileData.id,
            name: profileData.name,
            email: user.email || '', // email 從 auth.users 取得
            phone: profileData.phone,
            nationalId: profileData.national_id,
            nationalIdVerified: profileData.national_id_verified,
            role: profileData.role,
          })
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    }

    fetchUser()

    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')

    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({
        name: updates.name,
        phone: updates.phone,
        national_id: updates.nationalId,
        national_id_verified: updates.nationalIdVerified,
      })
      .eq('id', user.id)

    if (error) throw error

    // 更新本地狀態
    setProfile(prev => prev ? { ...prev, ...updates } : null)
  }

  return {
    user: profile,
    loading,
    updateProfile,
  }
}
