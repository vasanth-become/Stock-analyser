import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.quarterlyReport.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark as read
  if (!report.wasRead) {
    await prisma.quarterlyReport.update({
      where: { id: params.id },
      data: { wasRead: true, readAt: new Date() },
    })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
  const isPro = user?.plan === 'PRO'

  return NextResponse.json({ ...report, isPro })
}
