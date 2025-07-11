import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Check authentication tokens
  const authToken = request.cookies.get('supabase-auth-token')?.value
  const refreshToken = request.cookies.get('supabase-refresh-token')?.value
  const authStatus = request.cookies.get('auth-status')?.value
  
  // If we have auth tokens but no auth status, set it
  if (authToken && refreshToken && !authStatus) {
    response.cookies.set('auth-status', 'authenticated', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
  }
  
  // If we have auth status but no tokens, clear it
  if (authStatus === 'authenticated' && (!authToken || !refreshToken)) {
    response.cookies.set('auth-status', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 