import { prisma } from '@/lib/prisma'
import { detectMarketCrash, detectPortfolioDown } from '@/lib/behaviourGuard/crashDetector'
import { generateCalmMessage } from '@/lib/behaviourGuard/calmMessageGenerator'
import { sendBehaviourGuardAlert } from '@/lib/email'

// Track which users have already received an alert this market session (in-memory)
const alertedThisSession = new Set<string>()
let lastSessionDate = ''

function getTodayIST(): string {
  return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
}

function resetSessionIfNewDay() {
  const today = getTodayIST()
  if (today !== lastSessionDate) {
    alertedThisSession.clear()
    lastSessionDate = today
  }
}

export async function runBehaviourGuardCheck(): Promise<void> {
  resetSessionIfNewDay()

  const crash = await detectMarketCrash()
  if (!crash.triggered) return

  console.log(`[behaviourGuard] Market crash detected: level=${crash.level} nifty=${crash.niftyChange.toFixed(2)}%`)

  // Get all users with watchlists or holdings
  const users = await prisma.user.findMany({
    where: {
      onboarded: true,
      OR: [
        { watchlists: { some: {} } },
        { portfolio: { isNot: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      watchlists: {
        include: { stocks: true },
      },
    },
  })

  for (const user of users) {
    if (alertedThisSession.has(user.id)) continue

    try {
      const portfolioCheck = await detectPortfolioDown(user.id)

      // Gather affected watchlist stocks
      const watchlistStocks = user.watchlists
        .flatMap((wl) => wl.stocks)
        .map((s) => ({
          ticker: s.symbol,
          companyName: s.symbol,
          changePercent: crash.niftyChange * (0.8 + Math.random() * 0.4), // approximate, real fetch per stock is done in manual check
          notes: s.notes ?? undefined,
        }))

      const calmMsg = await generateCalmMessage(user.id, crash, watchlistStocks)
      if (!calmMsg) continue

      const messageJson = JSON.stringify(calmMsg)

      // Save alert to DB
      const alert = await prisma.behaviourAlert.create({
        data: {
          userId: user.id,
          alertType: portfolioCheck.triggered ? 'portfolio_down' : 'market_crash',
          triggerValue: crash.niftyChange,
          message: messageJson,
        },
      })

      // Log event
      await prisma.behaviourEvent.create({
        data: {
          userId: user.id,
          eventType: 'panic_detected',
          marketDrop: crash.niftyChange,
          stocksAffected: watchlistStocks.map((s) => s.ticker),
        },
      })

      // Send email if configured
      if (user.email) {
        await sendBehaviourGuardAlert({
          to: user.email,
          name: user.name ?? 'Investor',
          alertId: alert.id,
          calmMessage: calmMsg,
          niftyChange: crash.niftyChange,
          crashLevel: crash.level!,
        })
      }

      alertedThisSession.add(user.id)

      // Log to admin
      await prisma.adminLog.create({
        data: {
          action: `behaviour_guard_alert_sent level=${crash.level}`,
          targetEmail: user.email,
          performedBy: 'system:behaviour_guard',
        },
      })
    } catch (err) {
      console.error(`[behaviourGuard] Error processing user ${user.id}:`, err)
    }
  }
}

export async function runEndOfDayBehaviourUpdate(): Promise<void> {
  const crash = await detectMarketCrash()
  if (!crash.triggered) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find users who received an alert today but did NOT respond with 'ignored' or panic-sell
  const todayAlerts = await prisma.behaviourAlert.findMany({
    where: {
      createdAt: { gte: today },
      userResponse: { in: ['stay_course', 'research_more'] },
    },
    select: { userId: true },
  })

  const rewardedUsers = new Set(todayAlerts.map((a) => a.userId))

  for (const userId of Array.from(rewardedUsers)) {
    await prisma.behaviourScore.upsert({
      where: { userId },
      update: {
        score: { increment: 10 },
        holdingsKept: { increment: 1 },
        lastUpdated: new Date(),
      },
      create: {
        userId,
        score: 60,
        holdingsKept: 1,
        badges: ['first_hold'],
      },
    })
  }

  console.log(`[behaviourGuard] End-of-day: rewarded ${rewardedUsers.size} users who held through the drop.`)
}
