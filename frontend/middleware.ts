import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/', '/auth/sign-in', '/auth/sign-up', '/search', '/clubs']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  // Always allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // If no token and trying to access protected route, redirect to sign in
  if (!token) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}