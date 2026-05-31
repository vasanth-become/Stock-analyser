import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateQuarterlyReport, type ReportData } from '@/lib/quarterlyReport/reportGenerator'
import { currentQuarter } from '@/lib/quarterlyReport/dataCollector'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reports = await prisma.quarterlyReport.findMany({
    where: { userId: session.user.id },
    select: {
      id: true, quarter: true, generatedAt: true,
      portfolioScore: true, portfolioGrade: true,
      wasRead: true, wasEmailed: true,
    },
    orderBy: { generatedAt: 'desc' },
  })
  return NextResponse.json(reports)
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  })

  const q = currentQuarter()

  // Free users can generate but see only preview
  const existing = await prisma.quarterlyReport.findUnique({
    where: { userId_quarter: { userId: session.user.id, quarter: q } },
  })

  if (existing && user?.plan === 'FREE') {
    return NextResponse.json({ id: existing.id, plan: 'FREE', previewOnly: true })
  }

  if (existing && user?.plan === 'PRO') {
    // PRO: allow once per month (check if generated in last 30 days)
    const daysSince = (Date.now() - existing.generatedAt.getTime()) / 86400000
    if (daysSince < 30) {
      return NextResponse.json({ error: 'Report already generated this month. Next available in ' + Math.ceil(30 - daysSince) + ' days.' }, { status: 429 })
    }
  }

  try {
    const id = await generateQuarterlyReport(session.user.id, q)
    return NextResponse.json({ id, plan: user?.plan ?? 'FREE', previewOnly: user?.plan !== 'PRO' })
  } catch (err) {
    console.error('[api/reports POST]', err)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
