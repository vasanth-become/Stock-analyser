import { prisma } from './prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'StockAnalyser <alerts@stockanalyser.app>'

export interface SpendCheckResult {
  safe: boolean
  currentSpend: number
  limit: number
}

export async function checkSpendLimit(): Promise<SpendCheckResult> {
  const limit = parseFloat(process.env.MONTHLY_SPEND_LIMIT ?? '50')
  const month = new Date().toISOString().slice(0, 7)

  const usage = await prisma.monthlyApiUsage.findUnique({ where: { month } })
  const currentSpend = usage?.estimatedCost ?? 0

  if (currentSpend >= limit) {
    // Log to AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'spend_limit_reached',
        performedBy: 'system',
        targetEmail: process.env.ADMIN_EMAIL,
      },
    }).catch(() => {}) // non-fatal

    return { safe: false, currentSpend, limit }
  }

  // Warn at 80%
  if (currentSpend >= limit * 0.8) {
    const warningSubject = `⚠️ API spend at ${Math.round((currentSpend / limit) * 100)}% of monthly limit`
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      resend.emails.send({
        from: FROM,
        to: adminEmail,
        subject: warningSubject,
        html: `<p>Current spend: <strong>$${currentSpend.toFixed(2)}</strong> of $${limit} monthly limit.</p>
               <p>Total calls this month: ${usage?.totalCalls ?? 0}</p>`,
      }).catch(() => {})
    }
  }

  return { safe: true, currentSpend, limit }
}
