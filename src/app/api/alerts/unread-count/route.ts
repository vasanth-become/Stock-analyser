import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ count: 0 })

  const userId = session.user.id

  const [priceCount, thesisCount, behaviourCount] = await Promise.all([
    prisma.alert.count({ where: { userId, triggered: true, active: true } }),
    (prisma.thesisAlert as typeof prisma.thesisAlert | undefined)
      ?.count({ where: { thesis: { userId }, isRead: false } })
      .catch(() => 0) ?? 0,
    (prisma.behaviourAlert as typeof prisma.behaviourAlert | undefined)
      ?.count({ where: { userId, wasRead: false } })
      .catch(() => 0) ?? 0,
  ])

  return NextResponse.json({ count: priceCount + thesisCount + behaviourCount })
}
