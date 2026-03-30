import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const BASE_PATH = '/mailcraft'

// req.nextUrl.pathname includes the basePath prefix (e.g. '/mailcraft/login')
// Strip it so route checks are clean (e.g. '/login')
function route(pathname: string): string {
  if (pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || '/'
  }
  return pathname
}

// Build redirect URLs that always include basePath
function redirectTo(path: string, req: { nextUrl: URL }) {
  const url = new URL(req.nextUrl.href)
  url.pathname = `${BASE_PATH}${path}`
  url.search = ''
  return NextResponse.redirect(url)
}

export default auth((req) => {
  const path = route(req.nextUrl.pathname)
  const session = req.auth

  // Redirect authenticated users away from login/root
  if (path === '/login' || path === '/') {
    if (session) return redirectTo('/dashboard', req)
    return NextResponse.next()
  }

  // Admin-only routes
  if (path.startsWith('/admin')) {
    if (!session) return redirectTo('/login', req)
    if (session.user?.role !== 'ADMIN') return redirectTo('/dashboard', req)
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!session) return redirectTo('/login', req)

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.webp|.*\\.gif).*)',
  ],
}
