import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alerts = await prisma.thesisAlert.findMany({
    where: { thesis: { userId: session.user.id }, isRead: false },
    include: { thesis: { select: { ticker: true, companyName: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(alerts)
}
