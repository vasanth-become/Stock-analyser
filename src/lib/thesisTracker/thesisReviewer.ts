import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ThesisStatus = 'intact' | 'weakening' | 'broken' | 'achieved'

interface ReviewResult {
  newStatus: ThesisStatus
  confidenceScore: number
  statusChanged: boolean
  aiSummary: string
  keyChanges: string[]
  updatedWatchPoints: string[]
  actionSuggestion: string
}

export async function reviewThesis(thesisId: string, reviewedBy: string = 'auto_weekly'): Promise<ReviewResult | null> {
  const thesis = await prisma.stockThesis.findUnique({
    where: { id: thesisId },
    include: { user: { include: { profile: true } } },
  })
  if (!thesis) return null

  // Fetch current fundamentals stub (real implementation would call getStockFundamentals)
  let currentFundamentals: Record<string, unknown> = {}
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/market/quote?symbol=${thesis.ticker}&exchange=NSE&fundamentals=true`,
      { next: { revalidate: 0 } },
    )
    if (res.ok) {
      const data = await res.json()
      currentFundamentals = data.fundamentals ?? data.quote ?? {}
    }
  } catch { /* proceed without live data */ }

  const storedMetrics = thesis.keyMetrics as Record<string, unknown>

  const prompt = `You are ARIA's Thesis Reviewer. Re-evaluate this investment thesis.

Original thesis (written ${thesis.addedAt.toISOString().slice(0, 10)}):
"${thesis.originalThesis}"

Current status: ${thesis.currentStatus}
Current confidence: ${thesis.confidenceScore}/100

Stored metrics when thesis was written:
${JSON.stringify(storedMetrics, null, 2)}

Current fundamentals:
${JSON.stringify(currentFundamentals, null, 2)}

Watch points being monitored:
${thesis.watchPoints.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Status definitions:
- intact: All key assumptions still valid
- weakening: One or more assumptions under pressure
- broken: A fundamental assumption has failed
- achieved: Target price reached or exceeded

Respond in JSON only (no markdown):
{
  "newStatus": "intact",
  "confidenceScore": 75,
  "statusChanged": false,
  "aiSummary": "2-3 sentences what changed and what it means",
  "keyChanges": ["change 1", "change 2"],
  "updatedWatchPoints": ["most important thing to monitor this week"],
  "actionSuggestion": "continue_holding"
}`

  let result: ReviewResult
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    result = JSON.parse(jsonStr) as ReviewResult
    result.statusChanged = result.newStatus !== thesis.currentStatus
  } catch {
    result = {
      newStatus: thesis.currentStatus as ThesisStatus,
      confidenceScore: thesis.confidenceScore,
      statusChanged: false,
      aiSummary: 'Automated review could not fetch updated data. Thesis status retained from last review.',
      keyChanges: ['Insufficient data for this review cycle'],
      updatedWatchPoints: thesis.watchPoints.slice(0, 1),
      actionSuggestion: 'continue_holding',
    }
  }

  const nextReviewDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Save review record
  await prisma.thesisReview.create({
    data: {
      thesisId,
      previousStatus: thesis.currentStatus,
      newStatus: result.newStatus,
      statusChanged: result.statusChanged,
      aiSummary: result.aiSummary,
      keyChanges: result.keyChanges,
      newConfidence: result.confidenceScore,
      reviewedBy,
    },
  })

  // Update thesis
  await prisma.stockThesis.update({
    where: { id: thesisId },
    data: {
      currentStatus: result.newStatus,
      confidenceScore: result.confidenceScore,
      lastReviewedAt: new Date(),
      nextReviewDue,
    },
  })

  // Create alert if status changed
  if (result.statusChanged) {
    const alertMessages: Record<ThesisStatus, string> = {
      weakening: `⚠️ Thesis for ${thesis.ticker} is now WEAKENING — ${result.aiSummary.slice(0, 120)}`,
      broken: `❌ Thesis for ${thesis.ticker} is now BROKEN — ${result.aiSummary.slice(0, 120)}`,
      achieved: `🎯 Target achieved for ${thesis.ticker}! ${result.aiSummary.slice(0, 120)}`,
      intact: `✅ Thesis for ${thesis.ticker} has recovered to INTACT`,
    }
    await prisma.thesisAlert.create({
      data: {
        thesisId,
        alertType: 'status_changed',
        message: alertMessages[result.newStatus] ?? `Thesis status changed to ${result.newStatus}`,
      },
    })

    // If broken, also fire a Behaviour Guard behaviour event
    if (result.newStatus === 'broken') {
      await prisma.behaviourEvent.create({
        data: {
          userId: thesis.userId,
          eventType: 'thesis_checked',
          marketDrop: 0,
          userAction: 'thesis_broken',
          stocksAffected: [thesis.ticker],
        },
      })
    }
  }

  return result
}
