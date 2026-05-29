/**
 * Server-side cron jobs — run in-process on long-running Node.js servers.
 * For serverless / Vercel deployments use /api/cron/* routes instead.
 *
 * Jobs:
 *  1. Market data cache refresh  — every 15 min, Mon–Fri, during market hours
 *  2. Price alert checker        — every 15 min, Mon–Fri, during market hours
 *  3. Weekly market digest email — Monday 08:00 IST (02:30 UTC)
 */

import { cacheInvalidate } from './cache'
import { isMarketOpen } from './marketData'

let initialised = false

export function initMarketCron(): void {
  if (initialised || process.env.NODE_ENV === 'test') return
  initialised = true

  import('node-cron').then(({ default: cron }) => {

    // ── Job 1: Market data refresh ─────────────────────────────────────────
    cron.schedule('*/15 * * * 1-5', async () => {
      if (!isMarketOpen()) return
      console.log('[cron] Refreshing market data cache…')
      try {
        cacheInvalidate('indices:')
        cacheInvalidate('sectors:')
        cacheInvalidate('movers:')
        const { getIndexQuotes, getSectorPerformance, getTopGainersLosers } =
          await import('./marketData')
        await Promise.allSettled([
          getIndexQuotes(),
          getSectorPerformance(),
          getTopGainersLosers(),
        ])
        console.log('[cron] Market data refreshed.')
      } catch (err) {
        console.error('[cron] Refresh failed:', err)
      }
    })

    // ── Job 2: Price alert checker ─────────────────────────────────────────
    cron.schedule('*/15 * * * 1-5', async () => {
      if (!isMarketOpen()) return
      console.log('[cron] Checking price alerts…')
      try {
        const { checkAlerts } = await import('./alertChecker')
        await checkAlerts()
      } catch (err) {
        console.error('[cron] Alert check failed:', err)
      }
    })

    // ── Job 3: Weekly digest — Monday 02:30 UTC = 08:00 IST ───────────────
    cron.schedule('30 2 * * 1', async () => {
      console.log('[cron] Sending weekly market digest emails…')
      try {
        const { sendWeeklyDigests } = await import('./alertChecker')
        await sendWeeklyDigests()
      } catch (err) {
        console.error('[cron] Weekly digest failed:', err)
      }
    })

    console.log('[cron] All schedulers started (market refresh, alert checker, weekly digest).')
  }).catch((err) => {
    console.warn('[cron] node-cron unavailable, skipping schedulers:', err.message)
  })
}
