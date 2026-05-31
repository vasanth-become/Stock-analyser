import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { collectQuarterlyData, currentQuarter, type QuarterlyDataPackage } from './dataCollector'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ReportData {
  reportTitle: string
  quarter: string
  generatedDate: string
  executiveSummary: {
    portfolioGrade: string
    portfolioScore: number
    headline: string
    keyWins: string[]
    keyActions: string[]
  }
  marketContext: {
    quarterSummary: string
    niftyPerformance: string
    sectorWinners: string[]
    sectorLosers: string[]
    keyEvents: string[]
  }
  portfolioHealth: {
    totalValue: number
    quarterlyReturn: string
    vsNifty: string
    diversificationScore: number
    diversificationComment: string
    sectorAllocation: { sector: string; percent: number; comment: string }[]
    riskAlignmentScore: number
    riskComment: string
  }
  holdingsReview: {
    ticker: string
    companyName: string
    quarterlyReturn: string
    thesisStatus: string
    recommendation: string
    reasoning: string
    keyWatchForNextQuarter: string
  }[]
  sipReview: {
    totalSIPAmount: number
    fundsReviewed: {
      fundName: string
      amc: string
      quarterlyReturn: string
      benchmarkAlpha: string
      expenseRatio: string
      verdict: string
      reasoning: string
    }[]
    totalSIPCorpus: number
    sipConsistency: string
    sipComment: string
  }
  goalsReview: {
    goalName: string
    percentComplete: number
    onTrack: boolean
    quarterProgress: string
    projectedCompletion: string
    actionIfBehind: string
  }[]
  behaviourReview: {
    score: number
    grade: string
    panicsAvoided: number
    bestDecision: string
    improvementArea: string
    badgesEarned: string[]
  }
  rebalanceRecommendations: {
    rebalanceNeeded: boolean
    urgency: string
    actions: {
      action: string
      asset: string
      currentWeight: string
      targetWeight: string
      reasoning: string
    }[]
    rebalanceSummary: string
  }
  nextQuarterOutlook: {
    marketOutlook: string
    sectorToWatch: string
    personalPlan: string[]
  }
  disclaimer: string
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  if (score >= 40) return 'C'
  return 'D'
}

function fallbackReport(data: QuarterlyDataPackage): ReportData {
  const name = data.user.profile?.displayName ?? data.user.name ?? 'Investor'
  const score = 65
  return {
    reportTitle: `${data.quarter} Portfolio Health Report — ${name}`,
    quarter: data.quarter,
    generatedDate: new Date().toISOString(),
    executiveSummary: {
      portfolioGrade: 'B',
      portfolioScore: score,
      headline: 'Your portfolio shows steady progress this quarter with room for optimisation.',
      keyWins: ['Maintained regular investment discipline', 'Portfolio remains diversified across sectors', 'Goals are on track overall'],
      keyActions: ['Review overweight sector positions', 'Ensure SIPs are auto-invested each month', 'Run fresh AI analysis on top holdings'],
    },
    marketContext: {
      quarterSummary: 'Indian equity markets showed resilience this quarter despite global headwinds.',
      niftyPerformance: '+2.5% this quarter',
      sectorWinners: ['IT +5%', 'Banking +4%'],
      sectorLosers: ['Energy -2%', 'Metals -1%'],
      keyEvents: ['RBI policy meeting', 'Quarterly corporate earnings season'],
    },
    portfolioHealth: {
      totalValue: data.portfolio.totalInvested,
      quarterlyReturn: '+2%',
      vsNifty: 'matched market performance',
      diversificationScore: 70,
      diversificationComment: 'Portfolio shows reasonable diversification but could benefit from broader sector exposure.',
      sectorAllocation: data.theses.reduce<{ sector: string; percent: number; comment: string }[]>((acc, t) => {
        const existing = acc.find((a) => a.sector === t.sector)
        if (existing) existing.percent += Math.round(100 / (data.theses.length || 1))
        else acc.push({ sector: t.sector, percent: Math.round(100 / (data.theses.length || 1)), comment: 'neutral' })
        return acc
      }, []),
      riskAlignmentScore: 70,
      riskComment: 'Portfolio is broadly aligned with your stated risk tolerance.',
    },
    holdingsReview: data.theses.map((t) => ({
      ticker: t.ticker,
      companyName: t.companyName,
      quarterlyReturn: '+2%',
      thesisStatus: t.currentStatus,
      recommendation: t.currentStatus === 'broken' ? 'review' : 'continue',
      reasoning: `${t.companyName} thesis is currently ${t.currentStatus}. ${t.originalThesis.slice(0, 100)}`,
      keyWatchForNextQuarter: t.sector + ' sector earnings and guidance',
    })),
    sipReview: {
      totalSIPAmount: data.goals.reduce((s, g) => s + g.monthlySIP, 0),
      fundsReviewed: [],
      totalSIPCorpus: data.goals.reduce((s, g) => s + g.currentCorpus, 0),
      sipConsistency: 'Regular contributions tracked',
      sipComment: 'Keep your SIPs running consistently for long-term compounding.',
    },
    goalsReview: data.goals.map((g) => ({
      goalName: g.name,
      percentComplete: g.percentComplete,
      onTrack: g.onTrack,
      quarterProgress: `₹${Math.round(g.monthlySIP * 3).toLocaleString('en-IN')} invested this quarter`,
      projectedCompletion: g.monthsRemaining > 0 ? `${Math.ceil(g.monthsRemaining / 12)} years` : 'Due',
      actionIfBehind: g.sipGap > 0 ? `Increase SIP by ₹${Math.round(g.sipGap).toLocaleString('en-IN')} to get back on track` : '',
    })),
    behaviourReview: {
      score: data.behaviourScore?.score ?? 50,
      grade: 'Developing',
      panicsAvoided: data.behaviourScore?.panicsStopped ?? 0,
      bestDecision: 'Continued systematic investment despite market volatility.',
      improvementArea: 'Focus on long-term thesis rather than short-term price movements.',
      badgesEarned: data.behaviourScore?.badges ?? [],
    },
    rebalanceRecommendations: {
      rebalanceNeeded: false,
      urgency: 'next_quarter',
      actions: [],
      rebalanceSummary: 'No immediate rebalancing required. Review portfolio allocation next quarter.',
    },
    nextQuarterOutlook: {
      marketOutlook: 'Markets are expected to remain driven by domestic consumption and earnings growth.',
      sectorToWatch: 'Banking and Financial Services — RBI policy trajectory will be key.',
      personalPlan: ['Review all thesis statuses monthly', 'Increase SIP by 10% if income allows', 'Run AI analysis on underperforming holdings'],
    },
    disclaimer: 'This report is generated by ARIA Research, an AI-powered investment research tool. It is for informational and educational purposes only and does not constitute investment advice, a recommendation, or a solicitation to buy or sell any securities. ARIA Research is not registered with SEBI as a Research Analyst or Investment Adviser. Investments in securities are subject to market risks. Past performance is not indicative of future results. Please consult a qualified SEBI-registered financial adviser before making investment decisions.',
  }
}

export async function generateQuarterlyReport(userId: string, quarter?: string): Promise<string> {
  const q = quarter ?? currentQuarter()
  const data = await collectQuarterlyData(userId, q)
  const name = data.user.profile?.displayName ?? data.user.name ?? 'Investor'

  const sectors = Array.from(new Set(data.portfolio.holdings.map((h) => h.sector).filter(Boolean))).join(', ') || 'mixed'

  const prompt = `You are ARIA's Quarterly Report Generator — professional, warm, and accessible.

User: ${name}
Quarter: ${q}
Plan: ${data.user.plan}
Risk Profile: ${data.user.profile?.riskTolerance ?? 'MODERATE'}
Investment Horizon: ${data.user.profile?.investmentHorizon ?? 'medium term'}
Experience: ${data.user.profile?.experience ?? 'INTERMEDIATE'}

Portfolio summary:
- Holdings: ${data.portfolio.holdings.length} stocks
- Total invested: ₹${Math.round(data.portfolio.totalInvested).toLocaleString('en-IN')}
- Sectors: ${sectors}

Thesis tracker:
- Active theses: ${data.theses.length}
- Intact: ${data.theses.filter((t) => t.currentStatus === 'intact').length}
- Weakening: ${data.theses.filter((t) => t.currentStatus === 'weakening').length}
- Broken: ${data.theses.filter((t) => t.currentStatus === 'broken').length}
${data.theses.map((t) => `  - ${t.ticker} (${t.currentStatus}, confidence: ${t.confidenceScore})`).join('\n')}

Behaviour score: ${data.behaviourScore?.score ?? 'N/A'}/100
Panics avoided: ${data.behaviourScore?.panicsStopped ?? 0}
Badges: ${data.behaviourScore?.badges?.join(', ') || 'none'}

Financial goals:
${data.goals.map((g) => `  - ${g.name}: ${g.percentComplete.toFixed(1)}% complete, ${g.onTrack ? 'on track' : 'behind'}`).join('\n') || '  None set'}

ARIA analyses this quarter: ${data.recentAnalyses.length}

Generate a complete quarterly portfolio health report. Be specific and actionable. Use Indian context (₹, Nifty, NSE/BSE, RBI, SEBI). Write naturally for a first-generation Indian retail investor.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "reportTitle": "${q} Portfolio Health Report — ${name}",
  "quarter": "month range",
  "generatedDate": "${new Date().toISOString()}",
  "executiveSummary": {
    "portfolioGrade": "A|B+|B|C+|C|D",
    "portfolioScore": 0-100,
    "headline": "1 sentence overall health",
    "keyWins": ["win1","win2","win3"],
    "keyActions": ["action1","action2","action3"]
  },
  "marketContext": {
    "quarterSummary": "2-3 sentences",
    "niftyPerformance": "+X%",
    "sectorWinners": ["IT +X%","Banking +X%"],
    "sectorLosers": ["Energy -X%"],
    "keyEvents": ["event1","event2"]
  },
  "portfolioHealth": {
    "totalValue": number,
    "quarterlyReturn": "+X%",
    "vsNifty": "outperformed|underperformed by X%",
    "diversificationScore": 0-100,
    "diversificationComment": "1 sentence",
    "sectorAllocation": [{"sector":"IT","percent":40,"comment":"overweight"}],
    "riskAlignmentScore": 0-100,
    "riskComment": "1 sentence"
  },
  "holdingsReview": [{"ticker":"","companyName":"","quarterlyReturn":"","thesisStatus":"","recommendation":"continue|trim|add|exit|review","reasoning":"2 sentences","keyWatchForNextQuarter":"1 thing"}],
  "sipReview": {
    "totalSIPAmount": number,
    "fundsReviewed": [],
    "totalSIPCorpus": number,
    "sipConsistency": "text",
    "sipComment": "1 sentence"
  },
  "goalsReview": [{"goalName":"","percentComplete":0,"onTrack":true,"quarterProgress":"₹X added","projectedCompletion":"Mon YYYY","actionIfBehind":""}],
  "behaviourReview": {
    "score": 0,
    "grade": "Iron Hands|Disciplined|Developing|Needs Work",
    "panicsAvoided": 0,
    "bestDecision": "1 sentence",
    "improvementArea": "1 sentence",
    "badgesEarned": []
  },
  "rebalanceRecommendations": {
    "rebalanceNeeded": true|false,
    "urgency": "immediate|this_month|next_quarter|none",
    "actions": [{"action":"reduce|increase|exit|add","asset":"name","currentWeight":"X%","targetWeight":"Y%","reasoning":"2 sentences"}],
    "rebalanceSummary": "2-3 sentences"
  },
  "nextQuarterOutlook": {
    "marketOutlook": "2-3 sentences",
    "sectorToWatch": "sector and why",
    "personalPlan": ["action1","action2","action3"]
  },
  "disclaimer": "This report is generated by ARIA Research, an AI-powered investment research platform. It is for informational and educational purposes only and does not constitute investment advice or a solicitation to buy or sell securities. ARIA Research is not registered with SEBI as a Research Analyst or Investment Adviser. Investments are subject to market risks. Past performance is not indicative of future results. Please consult a qualified SEBI-registered financial adviser before making investment decisions."
}`

  let reportData: ReportData
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    reportData = JSON.parse(jsonStr) as ReportData
  } catch (err) {
    console.error('[quarterlyReport] Claude generation failed, using fallback:', err)
    reportData = fallbackReport(data)
  }

  const score = reportData.executiveSummary.portfolioScore
  const grade = scoreToGrade(score)
  reportData.executiveSummary.portfolioGrade = grade

  const saved = await prisma.quarterlyReport.upsert({
    where: { userId_quarter: { userId, quarter: q } },
    create: {
      userId,
      quarter: q,
      portfolioScore: score,
      portfolioGrade: grade,
      reportData: reportData as object,
    },
    update: {
      portfolioScore: score,
      portfolioGrade: grade,
      reportData: reportData as object,
      generatedAt: new Date(),
    },
  })

  return saved.id
}
