"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export type UserRole = "guest" | "host"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string
  nationalId?: string
  nationalIdVerified?: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, role: UserRole) => Promise<void>
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>
  logout: () => Promise<void>
  switchRole: (role: UserRole) => Promise<void>
  updateProfile: (updates: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCheckingSession = false

    // 檢查現有的 Supabase session
    const checkSession = async () => {
      if (isCheckingSession) {
        console.log('⚠️ 已經在檢查 session，跳過重複檢查')
        return
      }

      isCheckingSession = true

      try {
        console.log('🔍 AuthProvider 初始化：檢查現有 session...')

        // 添加超時保護
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn('⏱️ getSession 超時（10秒）')
            resolve(null)
          }, 10000)
        })

        const result = await Promise.race([sessionPromise, timeoutPromise])

        if (result === null) {
          console.error('❌ getSession 超時，清空 session')
          setUser(null)
          await supabase.auth.signOut()
          return
        }

        const { data: { session }, error } = result

        if (error) {
          console.error('❌ 獲取 session 錯誤，清空狀態:', error)
          setUser(null)
          await supabase.auth.signOut()
          return
        }

        if (session?.user) {
          console.log('✅ 找到現有 session，獲取用戶檔案...')
          try {
            await fetchUserProfile(session.user)
          } catch (profileError) {
            console.error('❌ 獲取用戶檔案失敗，清空狀態:', profileError)
            // fetchUserProfile 已經處理了登出，這裡只需要確保狀態清空
            setUser(null)
          }
        } else {
          console.log('ℹ️ 沒有現有 session，用戶未登入')
        }
      } catch (error) {
        console.error('❌ 檢查 session 錯誤，清空狀態:', error)
        setUser(null)
        await supabase.auth.signOut()
      } finally {
        console.log('🏁 AuthProvider 初始化完成，設置 isLoading = false')
        setIsLoading(false)
        isCheckingSession = false
      }
    }

    // 立即開始初始化
    checkSession()

    // 設置一個超時保護，確保 loading 狀態不會永遠卡住
    const timeout = setTimeout(() => {
      if (isCheckingSession) {
        console.log('⏰ Auth 初始化超時（5秒），強制設置 loading = false')
        setIsLoading(false)
        setUser(null)
      }
    }, 5000) // 5 秒超時

    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth 狀態變化:', event)
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ 用戶登入，獲取檔案...')
        try {
          await fetchUserProfile(session.user)
        } catch (error) {
          console.error('❌ Auth 狀態變化時獲取檔案失敗:', error)
          // fetchUserProfile 已經處理了登出
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 用戶登出')
        setUser(null)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (supabaseUser: SupabaseUser, retryCount = 0) => {
    try {
      console.log('🔍 開始查詢用戶檔案:', supabaseUser.id, retryCount > 0 ? `(重試 ${retryCount}/2)` : '')
      console.log('📧 用戶 email:', supabaseUser.email)

      // 檢查當前 session 狀態（用於調試 RLS 問題）
      let { data: { session } } = await supabase.auth.getSession()
      console.log('🔐 當前 session 狀態:', {
        hasSession: !!session,
        userId: session?.user?.id,
        matches: session?.user?.id === supabaseUser.id
      })

      // 如果 session 不存在或 ID 不匹配，等待一下讓 session 同步
      if (!session || session.user?.id !== supabaseUser.id) {
        console.log('⏳ Session 尚未同步，等待 200ms...')
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // 重新檢查
        const result = await supabase.auth.getSession()
        session = result.data.session
        console.log('🔐 重新檢查 session:', {
          hasSession: !!session,
          userId: session?.user?.id,
          matches: session?.user?.id === supabaseUser.id
        })
      }

      console.log('📡 發送資料庫查詢請求...')

      // 使用 Promise.race 搭配超時控制
      const { data: profile, error } = await Promise.race([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('查詢用戶檔案超時（15秒）')), 15000)
        )
      ])

      console.log('✅ 資料庫查詢回應完成')
      console.log('📊 查詢結果:', { hasProfile: !!profile, hasError: !!error, errorCode: error?.code })

      if (error) {
        console.log('⚠️ 用戶檔案查詢錯誤:', error)

        if (error.code === 'PGRST116') {
          // 用戶檔案不存在
          console.error('❌ 用戶檔案不存在')
          setUser(null)
          await supabase.auth.signOut()
          throw new Error('用戶檔案不存在，請重新註冊或聯絡管理員')
        } else {
          console.error('❌ 資料庫查詢錯誤:', error)
          throw new Error(`資料庫查詢失敗: ${error.message}`)
        }
      }

      if (!profile) {
        console.error('❌ 查詢成功但沒有返回檔案資料')
        throw new Error('無法獲取用戶檔案')
      }

      console.log('✅ 找到用戶檔案:', profile)

      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: profile.name || supabaseUser.user_metadata?.name || supabaseUser.email!.split('@')[0],
        role: profile.role || 'guest',
        phone: profile.phone,
        nationalId: profile.national_id,
        nationalIdVerified: profile.national_id_verified || false,
      }

      setUser(user)
    } catch (error) {
      console.error('❌ fetchUserProfile 錯誤:', error)

      // 如果是超時錯誤且還有重試次數，則重試
      if (error instanceof Error && error.message.includes('超時') && retryCount < 2) {
        console.log(`🔄 查詢超時，準備重試 (${retryCount + 1}/2)...`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待 1 秒後重試
        return fetchUserProfile(supabaseUser, retryCount + 1)
      }

      // 只有在致命錯誤（如用戶檔案不存在）時才登出
      // 超時或網路錯誤不應該強制登出用戶
      if (error instanceof Error && error.message.includes('用戶檔案不存在')) {
        console.log('⚠️ 用戶檔案不存在，執行登出')
        setUser(null)
        await supabase.auth.signOut()
      } else {
        console.log('⚠️ 暫時性錯誤，保持登入狀態但不設置用戶檔案')
        // 不登出，但清空用戶狀態，讓用戶可以重新整理頁面重試
        setUser(null)
      }

      throw error
    }
  }

  const login = async (email: string, password: string, role: UserRole) => {
    console.log('🔐 開始登入流程...', { email, role })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ 登入失敗:', error)
      throw new Error(error.message)
    }

    console.log('✅ Supabase 認證成功')

    if (data.user) {
      // 獲取用戶檔案，如果失敗則拋出錯誤
      console.log('🔍 開始獲取用戶檔案...')
      await fetchUserProfile(data.user)
      console.log('✅ 用戶檔案處理完成')
    }
  }

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        }
      }
    })

    if (error) {
      // 處理常見的註冊錯誤
      if (error.message.includes('already registered')) {
        throw new Error('此電子郵件已被註冊，請使用其他電子郵件或直接登入')
      } else if (error.message.includes('Invalid email')) {
        throw new Error('請輸入有效的電子郵件地址')
      } else if (error.message.includes('Password')) {
        throw new Error('密碼格式不正確，請確保至少 6 個字元')
      } else {
        throw new Error(error.message)
      }
    }

    if (data.user) {
      try {
        // 創建用戶檔案（包含必填的 email 欄位）
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email!,
            name,
            role,
            updated_at: new Date().toISOString()
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          throw profileError
        }

        // 如果用戶已確認 email，直接獲取檔案
        if (data.session) {
          await fetchUserProfile(data.user)
        }

        // 註冊成功，不需要返回值
      } catch (profileError) {
        console.error('Error creating user profile:', profileError)
        // 拋出錯誤，讓用戶知道註冊失敗
        throw new Error('創建用戶檔案失敗，請重試或聯絡管理員')
      }
    }
  }

  const updateUserProfile = async (userId: string, updates: Partial<Omit<User, 'id' | 'email'>>) => {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error updating user profile:', error)
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
    setUser(null)
  }

  const switchRole = async (role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role }
      setUser(updatedUser)
      await updateUserProfile(user.id, { role })
    }
  }

  const updateProfile = async (updates: Partial<Omit<User, 'id' | 'email'>>) => {
    if (user) {
      // 更新本地狀態
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)

      // 更新資料庫
      await updateUserProfile(user.id, updates)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, switchRole, updateProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
