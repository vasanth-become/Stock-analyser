/**
 * Market data refresh cron — runs in-process when using a long-running Node.js
 * server (e.g. `next start` or Docker).  For serverless / Vercel deployments
 * use the /api/cron/refresh route with Vercel Cron Jobs instead.
 *
 * Schedule: every 15 minutes, Mon–Fri only.
 * The job itself respects market hours (9:15 AM – 3:30 PM IST) and skips
 * runs outside that window to avoid needless API calls.
 */

import { cacheInvalidate } from './cache'
import { isMarketOpen } from './marketData'

let initialised = false

export function initMarketCron(): void {
  if (initialised || process.env.NODE_ENV === 'test') return
  initialised = true

  // Dynamic import keeps node-cron server-side only
  import('node-cron').then(({ default: cron }) => {
    // Every 15 min, Mon–Fri  (cron doesn't understand IST, so we guard in the job body)
    cron.schedule('*/15 * * * 1-5', async () => {
      if (!isMarketOpen()) return
      console.log('[cron] Refreshing market data cache…')
      try {
        cacheInvalidate('indices:')
        cacheInvalidate('sectors:')
        cacheInvalidate('movers:')
        // Warm the hot paths immediately so the next user request hits cache
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

    console.log('[cron] Market data scheduler started (every 15 min, Mon–Fri).')
  }).catch((err) => {
    console.warn('[cron] node-cron unavailable, skipping scheduler:', err.message)
  })
}
