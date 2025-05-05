/**
 * Middleware.ts - NextJS Server-Side Authentication Check
 * 
 * This file contains the middleware logic for route protection in Shelfd.
 * 
 * Important: This middleware runs on the server side for each request.
 * Since Shelfd uses client-side authentication (tokens in localStorage),
 * this middleware doesn't block protected routes but instead lets
 * client-side authentication handle the protection.
 */
import { NextRequest, NextResponse } from 'next/server'

/**
 * Public routes that anyone can access without authentication
 * These use pattern matching to allow routes like /movies/123 as well
 */
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

/**
 * Public assets that should always be accessible
 * Includes static files, images, and Next.js assets
 */
const publicPaths = [
  '/logo.png',
  '/shelfd-logo.png',
  '/favicon.ico',
  '/_next', // Next.js assets
  '/images/'
]

/**
 * The middleware function runs on every request before it reaches the page
 * It determines if the request should proceed based on authentication state
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  /**
   * IMPORTANT: This middleware can only check server-side cookies
   * The auth system uses localStorage for tokens, not cookies
   * So we need to bypass middleware protection for protected routes
   * and let the client-side protection handle it after page load
   */
  
  // First, check if the request is for a public asset
  for (const publicPath of publicPaths) {
    if (pathname.startsWith(publicPath)) {
      return NextResponse.next() // Allow access to public assets without any checks
    }
  }

  // Next, check if the current path matches any public route pattern
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes('(.*)')) {
      // For routes with wildcards, create a regex pattern and test the current path
      const pattern = new RegExp('^' + route.replace('(.*)', '.*') + '$')
      return pattern.test(pathname)
    }
    // For exact routes, just compare the strings
    return route === pathname
  })

  // Public routes are always allowed
  if (isPublicRoute) {
    return NextResponse.next()
  }

  /**
   * For protected routes, we pass through to client-side
   * because middleware can't access localStorage where our token is stored.
   * 
   * The client-side protection in _app.tsx or layout.tsx will check
   * the token and redirect to login if needed.
   */
  return NextResponse.next()
}

/**
 * Configure which paths the middleware should run on
 * This includes all paths except API routes and static assets
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|shelfd-logo.png).*)',
  ],
}