import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applyResponse, BADGE_DEFINITIONS } from '@/lib/behaviourGuard/scoreEngine'
import { z } from 'zod'

const schema = z.object({
  alertId: z.string(),
  response: z.enum(['stay_course', 'research_more', 'ignored']),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { alertId, response } = parsed.data

  const alert = await prisma.behaviourAlert.findUnique({ where: { id: alertId } })
  if (!alert || alert.userId !== session.user.id) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  await prisma.behaviourAlert.update({
    where: { id: alertId },
    data: { userResponse: response, wasRead: true },
  })

  const { newScore, newBadges } = await applyResponse(
    session.user.id,
    response,
    alert.triggerValue,
  )

  await prisma.behaviourEvent.create({
    data: {
      userId: session.user.id,
      eventType: response === 'stay_course' ? 'calm_confirmed' : 'thesis_checked',
      marketDrop: alert.triggerValue,
      userAction: response,
      stocksAffected: [],
    },
  })

  const badgeDetails = newBadges.map((id) => BADGE_DEFINITIONS.find((b) => b.id === id)).filter(Boolean)

  return NextResponse.json({ newScore, newBadges: badgeDetails })
}

// GET handler for email link clicks: ?alertId=xxx&response=yyy&redirect=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const alertId = searchParams.get('alertId')
  const response = searchParams.get('response') as 'stay_course' | 'research_more' | null
  const redirect = searchParams.get('redirect') === '1'

  if (!alertId || !response) {
    return NextResponse.redirect(new URL('/dashboard/behaviour', req.url))
  }

  const alert = await prisma.behaviourAlert.findUnique({ where: { id: alertId } })
  if (alert && !alert.userResponse) {
    await prisma.behaviourAlert.update({
      where: { id: alertId },
      data: { userResponse: response, wasRead: true },
    })
    await applyResponse(alert.userId, response, alert.triggerValue)
  }

  if (redirect) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    return NextResponse.redirect(new URL('/dashboard/behaviour?responded=1', appUrl))
  }

  return NextResponse.json({ ok: true })
}
