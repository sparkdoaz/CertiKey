import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'


// NextResponse.redirect(new URL('/home', request.url))

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 公開路徑列表 (不需要登入)
  const publicPaths = [
    '/',                    // 首頁
    '/properties',          // 房源列表
    '/login',               // 登入頁
    '/register',            // 註冊頁
    '/auth',                // OAuth 回調
    '/error',               // 錯誤頁
    '/smart-door-demo',     // 智慧門鎖 Demo
  ]

  // API 路由不進行重定向 (讓 API 自己處理認證)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // 檢查當前路徑是否為公開路徑
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(path + '/')
  )

  if (!user && !isPublicPath) {
    // 未登入且訪問受保護頁面 → 重定向到登入頁
    console.log('🔒 Middleware: 未登入用戶訪問受保護路由,重定向到登入頁:', request.nextUrl.pathname)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // 保存原始 URL 作為 redirect 參數 (可選)
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!
  return supabaseResponse
}