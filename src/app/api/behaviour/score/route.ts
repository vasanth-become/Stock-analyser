import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOrCreateScore, BADGE_DEFINITIONS } from '@/lib/behaviourGuard/scoreEngine'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const score = await getOrCreateScore(session.user.id)

  const enrichedBadges = BADGE_DEFINITIONS.map((def) => ({
    ...def,
    earned: score.badges.includes(def.id),
  }))

  return NextResponse.json({ ...score, badgeDetails: enrichedBadges })
}
