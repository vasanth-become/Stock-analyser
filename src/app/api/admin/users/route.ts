import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listUsers } from '@/lib/adminStats'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const search = searchParams.get('search') ?? ''

  const result = await listUsers(page, 20, search)
  return NextResponse.json(result)
}
