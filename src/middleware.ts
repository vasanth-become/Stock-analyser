import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Pro-only dashboard sub-routes — free users are redirected to /pricing
const PRO_ROUTES: Record<string, string> = {
  '/alerts': 'alerts',
  '/billing': 'billing',
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isOnboarded = session?.user?.onboarded ?? false
  const plan = session?.user?.plan ?? 'FREE'
  const role = session?.user?.role ?? 'USER'

  const isDashboard = nextUrl.pathname.startsWith('/dashboard')
  const isOnboarding = nextUrl.pathname.startsWith('/onboarding')
  const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register'
  const isAdmin = nextUrl.pathname.startsWith('/admin')

  if (isAdmin) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', nextUrl))
    if (role !== 'ADMIN') return NextResponse.redirect(new URL('/dashboard', nextUrl))
    return NextResponse.next()
  }

  if ((isDashboard || isOnboarding) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isAuthPage && isLoggedIn) {
    if (!isOnboarded) return NextResponse.redirect(new URL('/onboarding', nextUrl))
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (isDashboard && isLoggedIn && !isOnboarded) {
    return NextResponse.redirect(new URL('/onboarding', nextUrl))
  }

  if (isOnboarding && isLoggedIn && isOnboarded) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Gate Pro-only dashboard routes for free-tier users
  if (isDashboard && isLoggedIn && plan === 'FREE') {
    const dashPath = nextUrl.pathname.replace('/dashboard', '') || '/'
    const matched = Object.entries(PRO_ROUTES).find(([route]) =>
      dashPath === route || dashPath.startsWith(route + '/'),
    )
    if (matched) {
      return NextResponse.redirect(
        new URL(`/pricing?feature=${matched[1]}&upgrade=1`, nextUrl),
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/login', '/register', '/admin/:path*'],
}
