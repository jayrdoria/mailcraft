import { handlers } from '@/lib/auth'
import { NextRequest } from 'next/server'

const BASE_PATH = '/mailcraft'

// Next strips basePath from req.url in route handlers ('/api/auth/...'), but Auth.js
// matches against its full basePath ('/mailcraft/api/auth'). Without restoring the prefix
// every request here fails with UnknownAction (400) — including the Google OAuth callback.
// Credentials login is unaffected: it runs through a server action, not this route.
function withBasePath(req: NextRequest): NextRequest {
  const url = new URL(req.url)
  if (url.pathname.startsWith(`${BASE_PATH}/`)) return req
  url.pathname = `${BASE_PATH}${url.pathname}`
  return new NextRequest(url, req)
}

// Password login must only go through loginAction (lib/actions/auth.ts), which is rate-limited.
// Block the equivalent HTTP endpoints so they can't be used to brute-force passwords.
// Segments are parsed the way Auth.js does (empty segments dropped) so '//credentials' can't slip past.
function isCredentialsAction(req: NextRequest): boolean {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean)
  return segments.some((s) => {
    try {
      return decodeURIComponent(s).toLowerCase() === 'credentials'
    } catch {
      return true // malformed encoding — refuse rather than guess
    }
  })
}

export const GET = (req: NextRequest) => {
  if (isCredentialsAction(req)) return new Response('Not found', { status: 404 })
  return handlers.GET(withBasePath(req))
}

export const POST = (req: NextRequest) => {
  if (isCredentialsAction(req)) return new Response('Not found', { status: 404 })
  return handlers.POST(withBasePath(req))
}
