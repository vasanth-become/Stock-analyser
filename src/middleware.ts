import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isOnboarded = session?.user?.onboarded ?? false

  const isDashboard = nextUrl.pathname.startsWith('/dashboard')
  const isOnboarding = nextUrl.pathname.startsWith('/onboarding')
  const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register'

  // Redirect unauthenticated users away from protected routes
  if ((isDashboard || isOnboarding) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isLoggedIn) {
    if (!isOnboarded) return NextResponse.redirect(new URL('/onboarding', nextUrl))
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Redirect logged-in but not onboarded users to onboarding
  if (isDashboard && isLoggedIn && !isOnboarded) {
    return NextResponse.redirect(new URL('/onboarding', nextUrl))
  }

  // Redirect onboarded users away from onboarding page
  if (isOnboarding && isLoggedIn && isOnboarded) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/login', '/register'],
}
