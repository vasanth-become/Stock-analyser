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

    // ── Job 4: Monthly usage reset — midnight on the 1st of every month ──────
    cron.schedule('0 0 1 * *', async () => {
      console.log('[cron] Running monthly usage reset…')
      try {
        const { resetMonthlyUsage } = await import('./cron/resetMonthlyUsage')
        await resetMonthlyUsage()
      } catch (err) {
        console.error('[cron] Monthly usage reset failed:', err)
      }
    })

    // ── Job 5: Behaviour Guard — every 15 min during market hours ─────────
    cron.schedule('*/15 * * * 1-5', async () => {
      if (!isMarketOpen()) return
      console.log('[cron] Running Behaviour Guard check…')
      try {
        const { runBehaviourGuardCheck } = await import('./cron/behaviourGuardMonitor')
        await runBehaviourGuardCheck()
      } catch (err) {
        console.error('[cron] Behaviour Guard check failed:', err)
      }
    })

    // ── Job 6: Behaviour Guard end-of-day — 16:00 IST = 10:30 UTC Mon–Fri ─
    cron.schedule('30 10 * * 1-5', async () => {
      console.log('[cron] Running Behaviour Guard end-of-day update…')
      try {
        const { runEndOfDayBehaviourUpdate } = await import('./cron/behaviourGuardMonitor')
        await runEndOfDayBehaviourUpdate()
      } catch (err) {
        console.error('[cron] Behaviour Guard end-of-day failed:', err)
      }
    })

    // ── Job 7: Monthly Goal Clock update — 1st of month 03:30 UTC = 09:00 IST ─
    cron.schedule('30 3 1 * *', async () => {
      console.log('[cron] Sending monthly goal updates…')
      try {
        const { sendMonthlyGoalUpdates } = await import('./cron/goalMonthlyUpdate')
        await sendMonthlyGoalUpdates()
      } catch (err) {
        console.error('[cron] Monthly goal update failed:', err)
      }
    })

    console.log('[cron] All schedulers started (market refresh, alert checker, weekly digest, monthly reset, behaviour guard, goal monthly update).')
  }).catch((err) => {
    console.warn('[cron] node-cron unavailable, skipping schedulers:', err.message)
  })
}
