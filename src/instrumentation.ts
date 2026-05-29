/**
 * Next.js server instrumentation — runs once when the server process starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 1. Validate required environment variables — fail fast in production
    const { validateEnv } = await import('./lib/validateEnv')
    try {
      validateEnv()
    } catch (e) {
      console.error('[startup] Environment validation failed:')
      console.error(e instanceof Error ? e.message : String(e))
      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      }
    }

    // 2. Initialise Sentry server-side error tracking
    await import('../sentry.server.config')

    // 3. Initialise background cron jobs (in-process scheduler)
    const { initMarketCron } = await import('./lib/cron')
    initMarketCron()
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// onRequestError is a Next.js 15+ hook — import conditionally to stay compatible with 14
export async function onRequestError(
  error: { digest?: string } & Error,
  request: { path: string; method: string },
) {
  const { captureException } = await import('@sentry/nextjs')
  captureException(error, { tags: { path: request.path, method: request.method } })
}
