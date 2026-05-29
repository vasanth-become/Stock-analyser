import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserMetrics, getAnalysisMetrics, getTopRecommendedStocks, getRevenueMetrics, getApiUsageMetrics } from '@/lib/adminStats'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [users, analyses, topStocks, revenue, apiUsage] = await Promise.all([
    getUserMetrics(),
    getAnalysisMetrics(),
    getTopRecommendedStocks(),
    getRevenueMetrics(),
    getApiUsageMetrics(),
  ])

  return NextResponse.json({ users, analyses, topStocks, revenue, apiUsage })
}
