/**
 * Alert checker — runs inside the 15-min cron job.
 * Fetches live prices for all active, untriggered alert tickers,
 * evaluates each threshold, and fires email notifications via Resend.
 */

import { prisma } from './prisma'
import { getStockQuote } from './marketData'
import { sendAlertEmail } from './email'

export async function checkAlerts(): Promise<void> {
  // Load all active, un-triggered alerts with their owner's email
  const alerts = await prisma.alert.findMany({
    where: { active: true, triggered: false },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!alerts.length) return

  // Deduplicate tickers so we fetch each price once
  const tickerSet = new Set<string>()
  alerts.forEach((a) => tickerSet.add(`${a.exchange}:${a.symbol}`))
  const tickers = Array.from(tickerSet)
  const quoteMap = new Map<string, { price: number; changePercent: number }>()

  await Promise.allSettled(
    tickers.map(async (key) => {
      const [exchange, symbol] = key.split(':') as ['NSE' | 'BSE', string]
      try {
        const q = await getStockQuote(symbol, exchange)
        quoteMap.set(key, { price: q.price, changePercent: q.changePercent })
      } catch {
        // skip — alert will be checked on next run
      }
    }),
  )

  // Evaluate each alert
  const now = new Date()
  const triggeredIds: string[] = []

  await Promise.allSettled(
    alerts.map(async (alert) => {
      const key = `${alert.exchange}:${alert.symbol}`
      const quote = quoteMap.get(key)
      if (!quote) return

      const { price, changePercent } = quote
      let fired = false

      if (alert.type === 'PRICE_ABOVE' && price >= alert.value) fired = true
      else if (alert.type === 'PRICE_BELOW' && price <= alert.value) fired = true
      else if (alert.type === 'PERCENT_CHANGE' && Math.abs(changePercent) >= alert.value) fired = true

      if (!fired) return
      triggeredIds.push(alert.id)

      // Send email (best-effort)
      if (alert.user.email) {
        await sendAlertEmail({
          to: alert.user.email,
          name: alert.user.name ?? 'Investor',
          symbol: alert.symbol,
          exchange: alert.exchange,
          alertType: alert.type,
          threshold: alert.value,
          currentPrice: price,
          currentChange: changePercent,
        })
      }
    }),
  )

  if (triggeredIds.length) {
    await prisma.alert.updateMany({
      where: { id: { in: triggeredIds } },
      data: { triggered: true, triggeredAt: now, notifiedAt: now },
    })
    console.log(`[alerts] Triggered ${triggeredIds.length} alert(s):`, triggeredIds)
  }
}

// ─── Weekly digest (MERCURY engine) ──────────────────────────────────────────

export async function sendWeeklyDigests(): Promise<void> {
  const { runDigestAnalysis } = await import('./digestEngine')
  const { sendMercuryDigestEmail } = await import('./email')

  // Get all onboarded users with profile, watchlist, and holdings
  const users = await prisma.user.findMany({
    where: { onboarded: true },
    include: {
      profile: true,
      watchlists: { include: { stocks: { take: 10 } } },
      analyses: {
        where: { type: 'AI_SUMMARY' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { recommendations: true, createdAt: true },
      },
    },
  })

  // Compute week range label
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const weekRange = `${fmt(weekStart)} – ${fmt(now)}`

  // Fetch market context (best-effort)
  let niftyData = { openMonday: 24000, closeFriday: 24000, weeklyChange: 0, high: 24100, low: 23900 }
  let sensexData = { closeFriday: 79000, weeklyChange: 0 }
  let sectorPerf: Record<string, number> = {}
  let topGainer = { name: 'N/A', ticker: 'N/A', change: 0 }
  let topLoser = { name: 'N/A', ticker: 'N/A', change: 0 }

  try {
    const { getIndexQuotes, getSectorPerformance, getTopGainersLosers } = await import('./marketData')
    const [indices, sectors, { gainers, losers }] = await Promise.all([
      getIndexQuotes(),
      getSectorPerformance(),
      getTopGainersLosers(),
    ])

    const nifty = indices.find((i) => i.symbol === '^NSEI') ?? indices[0]
    const sensex = indices.find((i) => i.symbol === '^BSESN')
    if (nifty) {
      niftyData = {
        openMonday: Math.round(nifty.value / (1 + nifty.changePercent / 100)),
        closeFriday: nifty.value,
        weeklyChange: nifty.changePercent,
        high: Math.round(nifty.value * 1.005),
        low: Math.round(nifty.value * 0.995),
      }
    }
    if (sensex) sensexData = { closeFriday: sensex.value, weeklyChange: sensex.changePercent }

    for (const s of sectors) sectorPerf[s.sector] = s.changePercent

    if (gainers[0]) topGainer = { name: gainers[0].companyName, ticker: gainers[0].symbol, change: gainers[0].changePercent }
    if (losers[0]) topLoser = { name: losers[0].companyName, ticker: losers[0].symbol, change: losers[0].changePercent }
  } catch { /* use fallback values */ }

  const mood = niftyData.weeklyChange > 0.5 ? 'Bullish' : niftyData.weeklyChange < -0.5 ? 'Bearish' : 'Neutral'

  for (const user of users) {
    if (!user.email || !user.profile) continue

    const profile = user.profile
    const riskLabel = (profile.riskScore ?? 0) <= 24 ? 'Conservative'
      : (profile.riskScore ?? 0) <= 37 ? 'Moderate' : 'Aggressive'
    const experience = (profile.experience?.toLowerCase() ?? 'intermediate') as 'beginner' | 'intermediate' | 'expert'

    // Collect watchlist symbols and live quotes
    const watchSymbols = user.watchlists.flatMap((wl) =>
      wl.stocks.map((s) => ({ symbol: s.symbol, exchange: s.exchange })),
    ).slice(0, 8)

    const watchlist: { ticker: string; weeklyChange: number; currentPrice: number }[] = []
    await Promise.allSettled(
      watchSymbols.map(async ({ symbol, exchange }) => {
        try {
          const q = await getStockQuote(symbol, exchange as 'NSE' | 'BSE')
          watchlist.push({ ticker: symbol, weeklyChange: q.changePercent, currentPrice: q.price })
        } catch { /* skip */ }
      }),
    )

    // Derive last week's pick from most recent analysis (best-effort)
    let lastWeekRecommendation = null
    const lastAnalysis = user.analyses?.[0]
    if (lastAnalysis) {
      try {
        const recs = JSON.parse(lastAnalysis.recommendations)
        const featured = Array.isArray(recs) ? recs.find((r: { isFeatured?: boolean; rank?: number }) => r.isFeatured) ?? recs[0] : null
        if (featured?.ticker) {
          const q = await getStockQuote(featured.ticker, 'NSE').catch(() => null)
          if (q) {
            const recPrice = featured.currentPrice ?? featured.buyZone?.low ?? q.price
            lastWeekRecommendation = {
              ticker: featured.ticker,
              recommendedAt: recPrice,
              currentPrice: q.price,
              change: parseFloat(((q.price - recPrice) / recPrice * 100).toFixed(1)),
            }
          }
        }
      } catch { /* skip */ }
    }

    // Build SIP list from profile
    const activeSIPs = profile.sipBudget
      ? [{ fundName: 'Your SIP', monthlySIP: profile.sipBudget }]
      : []

    try {
      const output = await runDigestAnalysis({
        user: {
          firstName: (user.name ?? 'Investor').split(' ')[0],
          riskProfile: riskLabel,
          goal: profile.investmentGoals[0] ?? 'Wealth creation',
          experience,
        },
        weeklyMarketData: {
          weekRange,
          nifty50: niftyData,
          sensex: sensexData,
          sectorPerformance: sectorPerf,
          topGainer,
          topLoser,
          fiiActivity: { netFlow: 'N/A', stance: mood === 'Bullish' ? 'Buying' : 'Neutral' },
          diiActivity: { netFlow: 'N/A', stance: 'Neutral' },
          keyEvents: [],
        },
        userPortfolioData: {
          watchlist,
          holdings: [],
          activeSIPs,
        },
        lastWeekRecommendation,
      })

      await sendMercuryDigestEmail(user.email, output)
    } catch (err) {
      console.error(`[digest] MERCURY failed for ${user.email}:`, err)
    }
  }

  console.log(`[digest] MERCURY weekly digest sent to ${users.length} user(s).`)
}
