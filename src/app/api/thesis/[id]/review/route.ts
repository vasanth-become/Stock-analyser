import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reviewThesis } from '@/lib/thesisTracker/thesisReviewer'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thesis = await prisma.stockThesis.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!thesis) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Rate limit: once per 24h
  const recent = await prisma.thesisReview.findFirst({
    where: {
      thesisId: params.id,
      reviewedBy: 'user_triggered',
      reviewDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })
  if (recent) {
    return NextResponse.json({ error: 'Already reviewed in the last 24 hours' }, { status: 429 })
  }

  const result = await reviewThesis(params.id, 'user_triggered')
  const updated = await prisma.stockThesis.findUnique({
    where: { id: params.id },
    include: { reviews: { orderBy: { reviewDate: 'desc' }, take: 1 } },
  })
  return NextResponse.json({ result, thesis: updated })
}
