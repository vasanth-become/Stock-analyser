import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { z } from 'zod'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'StockAnalyser <alerts@stockanalyser.app>'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') return null
  return session
}

const broadcastSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(10000),
  // 'all' | 'pro' | 'free'
  audience: z.enum(['all', 'pro', 'free']).default('all'),
})

export async function POST(req: NextRequest) {
  const adminSession = await requireAdmin()
  if (!adminSession) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = broadcastSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { subject, body, audience } = parsed.data

  const planFilter =
    audience === 'pro'
      ? { plan: { in: ['PRO', 'ENTERPRISE'] as ['PRO', 'ENTERPRISE'] } }
      : audience === 'free'
        ? { plan: 'FREE' as const }
        : {}

  const users = await prisma.user.findMany({
    where: planFilter,
    select: { email: true, name: true },
  })

  if (users.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const html = broadcastHtml(subject, body)

  // Resend supports batches of up to 100 emails
  const BATCH = 100
  let sent = 0
  let failed = 0

  for (let i = 0; i < users.length; i += BATCH) {
    const chunk = users.slice(i, i + BATCH)
    try {
      await resend.batch.send(
        chunk.map((u) => ({
          from: FROM,
          to: u.email,
          subject,
          html: html.replace('{{name}}', u.name ?? 'there'),
        })),
      )
      sent += chunk.length
    } catch {
      failed += chunk.length
    }
  }

  return NextResponse.json({ sent, failed, total: users.length })
}

function broadcastHtml(subject: string, body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="margin-bottom:16px">
    <img src="https://stockanalyser.app/logo.png" alt="StockAnalyser" height="32" style="display:block"/>
  </div>
  <h2 style="margin-top:0;color:#1d4ed8">${subject}</h2>
  <p>Hi {{name}},</p>
  <div style="line-height:1.6">${escaped}</div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
  <p style="font-size:12px;color:#9ca3af">
    You received this because you have a StockAnalyser account.<br/>
    StockAnalyser · Bangalore, India
  </p>
</body>
</html>`
}
