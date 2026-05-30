import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, limiterKeyForPath } from '@/lib/rateLimit'

// Use the edge-safe auth config — no Prisma, no bcrypt, runs in Edge runtime
const { auth } = NextAuth(authConfig)

// Pro-only dashboard sub-routes — free users are redirected to /pricing
const PRO_ROUTES: Record<string, string> = {
  '/alerts': 'alerts',
  '/billing': 'billing',
}

export default auth(async (req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname

  // ── Rate limit all /api/* routes ────────────────────────────────────────────
  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    const ip =
      (req as NextRequest).headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      (req as NextRequest).headers.get('x-real-ip') ??
      '127.0.0.1'

    const key = limiterKeyForPath(pathname)
    const { limited, headers } = await checkRateLimit(`${ip}:${key}`, key)

    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Rate limit exceeded. Please slow down.' },
        { status: 429, headers },
      )
    }

    // Add rate-limit headers on successful API responses too
    const res = NextResponse.next()
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // ── Auth / routing checks for page routes ───────────────────────────────────
  const isLoggedIn = !!session?.user
  const isOnboarded = session?.user?.onboarded ?? false
  const plan = session?.user?.plan ?? 'FREE'
  const role = session?.user?.role ?? 'USER'

  const isDashboard = pathname.startsWith('/dashboard')
  const isOnboarding = pathname.startsWith('/onboarding')
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isAdmin = pathname.startsWith('/admin')

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
    const dashPath = pathname.replace('/dashboard', '') || '/'
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
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/login',
    '/register',
    '/admin/:path*',
  ],
}
