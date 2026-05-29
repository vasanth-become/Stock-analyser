/**
 * Next.js server instrumentation — runs once when the server process starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only initialise cron on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initMarketCron } = await import('./lib/cron')
    initMarketCron()
  }
}
