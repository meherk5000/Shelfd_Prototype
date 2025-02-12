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
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  // Check if path is public
  if (publicRoutes.includes(pathname)) {
    // If user is authenticated and trying to access auth pages, redirect to shelf
    if (token && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/shelf', request.url))
    }
    return NextResponse.next()
  }

  // Check protected routes
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}