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

// ─── Weekly digest ────────────────────────────────────────────────────────────

export async function sendWeeklyDigests(): Promise<void> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Get all users who have a watchlist and an investor profile
  const users = await prisma.user.findMany({
    where: { onboarded: true },
    include: {
      profile: true,
      watchlists: { include: { stocks: { take: 10 } } },
    },
  })

  // Compute week range label
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const weekRange = `${fmt(weekStart)} – ${fmt(now)}`

  // Fetch index performance (best-effort)
  let indexSummary: { name: string; changePercent: number }[] = []
  try {
    const { getIndexQuotes } = await import('./marketData')
    const indices = await getIndexQuotes()
    indexSummary = indices.slice(0, 4).map((idx) => ({
      name: idx.name,
      changePercent: idx.changePercent,
    }))
  } catch { /* skip */ }

  for (const user of users) {
    if (!user.email) continue

    // Collect watchlist symbols
    const watchSymbols = user.watchlists.flatMap((wl) =>
      wl.stocks.map((s) => ({ symbol: s.symbol, exchange: s.exchange })),
    ).slice(0, 8)

    // Fetch live quotes for watchlist
    const watchlistItems: { symbol: string; companyName: string; changePercent: number }[] = []
    await Promise.allSettled(
      watchSymbols.map(async ({ symbol, exchange }) => {
        try {
          const q = await getStockQuote(symbol, exchange as 'NSE' | 'BSE')
          watchlistItems.push({ symbol, companyName: q.companyName, changePercent: q.changePercent })
        } catch { /* skip */ }
      }),
    )

    // Generate AI pick of the week
    let aiRecommendation = 'Markets continue to present opportunities for disciplined, long-term investors. Stay focused on your asset allocation and SIP commitments.'
    if (user.profile && process.env.ANTHROPIC_API_KEY) {
      try {
        const riskLabel = (user.profile.riskScore ?? 0) <= 24 ? 'Conservative'
          : (user.profile.riskScore ?? 0) <= 37 ? 'Moderate' : 'Aggressive'
        const goals = user.profile.investmentGoals.join(', ') || 'wealth creation'
        const message = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: `You are an Indian market analyst. Write a single paragraph (3–4 sentences, no headers, no bullet points) as an "AI Pick of the Week" for a ${riskLabel} retail investor whose goals are ${goals}. Mention one specific Indian stock or mutual fund category that looks interesting this week and why. Keep it conversational and actionable. End with a note on risk.`,
          }],
        })
        aiRecommendation = (message.content[0] as { type: string; text: string }).text.trim()
      } catch { /* fallback text already set */ }
    }

    const { sendDigestEmail } = await import('./email')
    await sendDigestEmail({
      to: user.email,
      name: user.name ?? 'Investor',
      weekRange,
      indexSummary,
      watchlistItems,
      aiRecommendation,
    })
  }

  console.log(`[digest] Sent weekly digest to ${users.length} user(s).`)
}
