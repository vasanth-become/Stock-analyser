import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thesis = await prisma.stockThesis.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      reviews: { orderBy: { reviewDate: 'desc' } },
      alerts: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!thesis) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(thesis)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thesis = await prisma.stockThesis.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!thesis) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.stockThesis.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
