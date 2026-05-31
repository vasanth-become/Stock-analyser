import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [events, alerts] = await Promise.all([
    prisma.behaviourEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.behaviourAlert.findMany({
      where: { userId: session.user.id, wasRead: false },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ events, unreadAlerts: alerts })
}
