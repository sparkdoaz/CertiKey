import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'


// This function can be marked `async` if using `await` inside
  //return NextResponse.redirect(new URL('/home', request.url))
/**
 * Next.js Middleware
 * 在每個請求前執行,用於:
 * 1. 刷新 Supabase session
 * 2. 保護受限路由 (未登入重定向到 /login)
 */
export default async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {

 // example   matcher: '/about/:path*',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - certikey-logo.png (app logo)
     * Feel free to modify this pattern to include more paths.
     * - images (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|certikey-logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
