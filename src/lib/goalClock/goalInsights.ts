// Server-only — uses Anthropic SDK (Node.js). Never import this in client components.
import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { FinancialGoal } from '@prisma/client'
import type { GoalProjection } from './goalCalculator'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateGoalInsight(goal: FinancialGoal, projection: GoalProjection): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return ''
  try {
    const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
    const years = Math.floor(projection.monthsRemaining / 12)
    const months = projection.monthsRemaining % 12

    const prompt = `Financial goal: "${goal.name}" (${goal.goalType})
Target: ${fmtINR(goal.targetAmount)} by ${new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
Current corpus: ${fmtINR(goal.currentCorpus)} (${projection.percentComplete.toFixed(1)}% done)
Monthly SIP: ${fmtINR(goal.monthlySIP)}
Time left: ${years > 0 ? `${years} years` : ''} ${months > 0 ? `${months} months` : ''}
Projected corpus at target date: ${fmtINR(projection.projectedCorpus)} (at ${goal.expectedReturn}% p.a.)
On track: ${projection.onTrack ? 'yes' : 'no'}
SIP gap to close shortfall: ${fmtINR(projection.sipGap)}/month more needed
Step-up SIP impact: adds ${fmtINR(projection.stepUpImpact.extraCorpus)} extra, saves ${projection.stepUpImpact.monthsSaved} months

Write a 2–3 sentence personalised insight using the goal name naturally. Be warm, specific, use Indian number format. If on track, celebrate it. If behind, give ONE concrete action. No bullet points. No markdown.`

    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  } catch { return '' }
}

export async function generateMilestoneCelebration(goal: FinancialGoal, percent: number): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return `You've reached ${percent}% of ${goal.name}! Keep going!`
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Write a 1–2 sentence warm celebration message for reaching ${percent}% of the goal "${goal.name}". Be personal, warm, and encouraging. No markdown. Use the goal name naturally.`,
      }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  } catch { return `Amazing! You've reached ${percent}% of ${goal.name}!` }
}
