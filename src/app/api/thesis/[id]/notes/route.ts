import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notes } = await req.json()
  const thesis = await prisma.stockThesis.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!thesis) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.stockThesis.update({
    where: { id: params.id },
    data: { userNotes: notes },
  })
  return NextResponse.json(updated)
}
