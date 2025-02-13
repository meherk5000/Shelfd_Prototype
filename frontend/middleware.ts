import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
  '/', 
  '/auth/sign-in', 
  '/auth/sign-up',
  '/search',
  '/clubs'
]

const protectedPaths = [
  '/profile',
  '/shelf',
  '/activity',
  '/chat',
  '/create'
]

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth/')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Allow API routes to pass through
  if (isApiRoute) {
    return NextResponse.next()
  }

  // If user is on auth page but already has token, redirect to home
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is not on auth page and has no token, redirect to sign in
  if (!isAuthPage && !token) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}