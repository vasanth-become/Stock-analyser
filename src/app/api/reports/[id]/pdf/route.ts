import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.quarterlyReport.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
  if (user?.plan !== 'PRO') {
    return NextResponse.json({ error: 'PDF download is a Pro feature. Upgrade to access your full report.' }, { status: 403 })
  }

  const filePath = path.join('/tmp', 'reports', `${session.user.id}-${report.quarter}.pdf`)

  // Generate PDF if not cached
  if (!fs.existsSync(filePath)) {
    try {
      const { generatePDF } = await import('@/lib/quarterlyReport/pdfGenerator')
      await generatePDF(report.reportData as unknown as Parameters<typeof generatePDF>[0], session.user.id, report.quarter)
      await prisma.quarterlyReport.update({ where: { id: params.id }, data: { pdfUrl: filePath } })
    } catch (err) {
      console.error('[api/reports pdf]', err)
      return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
    }
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ARIA-${report.quarter}-Report.pdf"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
