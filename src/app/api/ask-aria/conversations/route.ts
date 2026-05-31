import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conversations = await prisma.aRIAConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      title: true,
      language: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true },
      },
    },
  })

  return NextResponse.json(
    conversations.map((c) => ({
      id: c.id,
      title: c.title ?? 'New conversation',
      language: c.language,
      updatedAt: c.updatedAt,
      preview: c.messages[0]?.content.slice(0, 80) ?? '',
    })),
  )
}
