import { NextRequest, NextResponse } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/search',
  '/clubs',
  '/movies',
  '/tv',
  '/books',
  '/movies/(.*)',
  '/tv/(.*)',
  '/books/(.*)'
]

// Public assets that should be accessible without authentication
const publicPaths = [
  '/logo.png',
  '/shelfd-logo.png',
  '/favicon.ico',
  '/_next', // Next.js assets
  '/images/'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // IMPORTANT: This middleware can only check server-side cookies
  // The auth system uses localStorage, not cookies
  // So we need to bypass middleware protection for protected routes
  // and let the client-side protection handle it
  
  // Check if the requested path is a public asset
  for (const publicPath of publicPaths) {
    if (pathname.startsWith(publicPath)) {
      return NextResponse.next() // Allow access to public assets
    }
  }

  // Check if the current path matches any public route pattern
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes('(.*)')) {
      const pattern = new RegExp('^' + route.replace('(.*)', '.*') + '$')
      return pattern.test(pathname)
    }
    return route === pathname
  })

  // Always allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, we'll let the client-side code handle the auth check
  // This is because middleware can't access localStorage where our token is stored
  return NextResponse.next()
}

// Match all request paths except for public assets
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|shelfd-logo.png).*)',
  ],
}