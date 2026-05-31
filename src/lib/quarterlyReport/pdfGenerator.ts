// PDF generation runs server-side only
// Uses @react-pdf/renderer with pure Node API (no React rendering)
import 'server-only'
import type { ReportData } from './reportGenerator'
import path from 'path'
import fs from 'fs'

const GRADE_COLOURS: Record<string, string> = {
  'A+': '#d97706', 'A': '#d97706',
  'B+': '#1A56DB', 'B': '#1A56DB',
  'C+': '#f59e0b', 'C': '#f59e0b',
  'D': '#dc2626',
}

function gradeColour(grade: string): string {
  return GRADE_COLOURS[grade] ?? '#6b7280'
}

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `Rs ${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000) return `Rs ${(n / 1_00_000).toFixed(1)} L`
  return `Rs ${Math.round(n).toLocaleString('en-IN')}`
}

export async function generatePDF(report: ReportData, userId: string, quarter: string): Promise<string> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer')
  const React = (await import('react')).default

  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', backgroundColor: '#ffffff', padding: 0 },
    coverPage: { backgroundColor: '#1a365d', padding: 50, minHeight: '100%' },
    coverBrand: { color: '#93c5fd', fontSize: 11, letterSpacing: 2, marginBottom: 8 },
    coverTitle: { color: '#ffffff', fontSize: 28, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
    coverSub: { color: '#bfdbfe', fontSize: 14, marginBottom: 40 },
    coverName: { color: '#ffffff', fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
    coverDate: { color: '#93c5fd', fontSize: 11, marginBottom: 40 },
    gradeCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    gradeText: { color: '#ffffff', fontSize: 32, fontFamily: 'Helvetica-Bold' },
    gradeLabel: { color: '#bfdbfe', fontSize: 11 },
    confidential: { color: '#475569', fontSize: 9, marginTop: 'auto', paddingTop: 20 },

    section: { padding: '28 40', borderBottom: '1 solid #e2e8f0' },
    sectionTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1e3a5f', marginBottom: 12 },
    sectionSub: { fontSize: 11, color: '#64748b', marginBottom: 8 },
    body: { fontSize: 11, color: '#374151', lineHeight: 1.6 },

    row: { flexDirection: 'row', marginBottom: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, marginRight: 8 },
    winDot: { backgroundColor: '#16a34a' },
    actionDot: { backgroundColor: '#1A56DB' },
    chip: { backgroundColor: '#eff6ff', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
    chipText: { color: '#1A56DB', fontSize: 9, fontFamily: 'Helvetica-Bold' },

    table: { marginTop: 8 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: '6 8', borderBottom: '1 solid #e2e8f0' },
    tableRow: { flexDirection: 'row', padding: '6 8', borderBottom: '1 solid #f1f5f9' },
    tableCell: { fontSize: 9, color: '#374151' },
    tableCellBold: { fontSize: 9, color: '#0f172a', fontFamily: 'Helvetica-Bold' },

    progressBar: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', marginBottom: 4 },
    progressFill: { height: 8, borderRadius: 4 },

    gradeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    footer: { padding: '12 40', backgroundColor: '#f8fafc', borderTop: '1 solid #e2e8f0' },
    footerText: { fontSize: 8, color: '#94a3b8' },
  })

  const r = report
  const gc = gradeColour(r.executiveSummary.portfolioGrade)

  const doc = React.createElement(
    Document,
    { title: r.reportTitle },

    // ── Page 1: Cover ──────────────────────────────────────────────────────
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.coverPage },
        React.createElement(Text, { style: styles.coverBrand }, 'ARIA RESEARCH — CONFIDENTIAL'),
        React.createElement(Text, { style: styles.coverTitle }, `${r.quarter} Portfolio Health Report`),
        React.createElement(Text, { style: styles.coverSub }, r.executiveSummary.headline),
        React.createElement(Text, { style: styles.coverName }, r.reportTitle.split('—')[1]?.trim() ?? ''),
        React.createElement(Text, { style: styles.coverDate }, `Generated: ${new Date(r.generatedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`),
        React.createElement(View, { style: [styles.gradeCircle, { backgroundColor: gc }] },
          React.createElement(Text, { style: styles.gradeText }, r.executiveSummary.portfolioGrade),
        ),
        React.createElement(Text, { style: styles.gradeLabel }, `Portfolio Score: ${r.executiveSummary.portfolioScore}/100`),
        React.createElement(Text, { style: styles.confidential }, 'This report is confidential and intended solely for the named recipient. For informational purposes only — not investment advice.'),
      ),
    ),

    // ── Page 2: Executive Summary ─────────────────────────────────────────
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Executive Summary'),
        React.createElement(Text, { style: [styles.body, { marginBottom: 16 }] }, r.executiveSummary.headline),
        React.createElement(Text, { style: [styles.sectionSub, { marginBottom: 8, fontFamily: 'Helvetica-Bold' }] }, 'Key Wins This Quarter'),
        ...r.executiveSummary.keyWins.map((w) => React.createElement(View, { style: styles.row, key: w },
          React.createElement(View, { style: [styles.dot, styles.winDot] }),
          React.createElement(Text, { style: styles.body }, w),
        )),
        React.createElement(Text, { style: [styles.sectionSub, { marginBottom: 8, fontFamily: 'Helvetica-Bold', marginTop: 12 }] }, 'Priority Actions Next Quarter'),
        ...r.executiveSummary.keyActions.map((a) => React.createElement(View, { style: styles.row, key: a },
          React.createElement(View, { style: [styles.dot, styles.actionDot] }),
          React.createElement(Text, { style: styles.body }, a),
        )),
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Market Context'),
        React.createElement(Text, { style: styles.body }, r.marketContext.quarterSummary),
        React.createElement(Text, { style: [styles.sectionSub, { marginTop: 10 }] }, `Nifty 50: ${r.marketContext.niftyPerformance}`),
        React.createElement(View, { style: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 } },
          ...[...r.marketContext.sectorWinners, ...r.marketContext.sectorLosers].map((s) =>
            React.createElement(View, { style: styles.chip, key: s },
              React.createElement(Text, { style: styles.chipText }, s),
            ),
          ),
        ),
      ),
    ),

    // ── Page 3: Portfolio Health & Holdings ───────────────────────────────
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Portfolio Health'),
        React.createElement(View, { style: { flexDirection: 'row', marginBottom: 12 } },
          ...[
            { label: 'Quarterly Return', value: r.portfolioHealth.quarterlyReturn },
            { label: 'vs Nifty', value: r.portfolioHealth.vsNifty },
            { label: 'Diversification', value: `${r.portfolioHealth.diversificationScore}/100` },
            { label: 'Risk Alignment', value: `${r.portfolioHealth.riskAlignmentScore}/100` },
          ].map(({ label, value }) => React.createElement(View, { key: label, style: { flex: 1, backgroundColor: '#f8fafc', padding: 10, marginRight: 8, borderRadius: 6 } },
            React.createElement(Text, { style: { fontSize: 8, color: '#64748b' } }, label),
            React.createElement(Text, { style: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginTop: 4 } }, value),
          )),
        ),
        React.createElement(Text, { style: styles.body }, r.portfolioHealth.diversificationComment),
        React.createElement(Text, { style: [styles.body, { marginTop: 6 }] }, r.portfolioHealth.riskComment),
      ),
      r.holdingsReview.length > 0 && React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Holdings Review'),
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.tableCellBold, { flex: 1 }] }, 'Stock'),
          React.createElement(Text, { style: [styles.tableCellBold, { width: 60 }] }, 'Return'),
          React.createElement(Text, { style: [styles.tableCellBold, { width: 60 }] }, 'Thesis'),
          React.createElement(Text, { style: [styles.tableCellBold, { width: 70 }] }, 'Action'),
        ),
        ...r.holdingsReview.map((h) => React.createElement(View, { style: styles.tableRow, key: h.ticker },
          React.createElement(Text, { style: [styles.tableCellBold, { flex: 1 }] }, `${h.ticker} ${h.companyName}`),
          React.createElement(Text, { style: [styles.tableCell, { width: 60 }] }, h.quarterlyReturn),
          React.createElement(Text, { style: [styles.tableCell, { width: 60 }] }, h.thesisStatus),
          React.createElement(Text, { style: [styles.tableCell, { width: 70, color: h.recommendation === 'exit' ? '#dc2626' : h.recommendation === 'add' ? '#16a34a' : '#374151' }] }, h.recommendation.toUpperCase()),
        )),
      ) as ReturnType<typeof React.createElement>,
    ),

    // ── Page 4: Goals & Behaviour ─────────────────────────────────────────
    React.createElement(Page, { size: 'A4', style: styles.page },
      r.goalsReview.length > 0 && React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Goals Progress'),
        ...r.goalsReview.map((g) => React.createElement(View, { key: g.goalName, style: { marginBottom: 14 } },
          React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 } },
            React.createElement(Text, { style: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' } }, g.goalName),
            React.createElement(Text, { style: { fontSize: 11, color: g.onTrack ? '#16a34a' : '#f59e0b', fontFamily: 'Helvetica-Bold' } }, `${g.percentComplete.toFixed(0)}% ${g.onTrack ? '✓ On track' : '⚠ Behind'}`),
          ),
          React.createElement(View, { style: styles.progressBar },
            React.createElement(View, { style: [styles.progressFill, { width: `${Math.min(100, g.percentComplete)}%`, backgroundColor: g.onTrack ? '#16a34a' : '#f59e0b' }] }),
          ),
          React.createElement(Text, { style: { fontSize: 9, color: '#64748b' } }, `${g.quarterProgress} · Target: ${g.projectedCompletion}`),
          !g.onTrack && g.actionIfBehind && React.createElement(Text, { style: { fontSize: 9, color: '#b45309', marginTop: 2 } }, g.actionIfBehind),
        )),
      ) as ReturnType<typeof React.createElement>,
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Behaviour Review'),
        React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 } },
          React.createElement(View, { style: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 } },
            React.createElement(Text, { style: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1A56DB' } }, `${r.behaviourReview.score}`),
          ),
          React.createElement(View, null,
            React.createElement(Text, { style: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a' } }, r.behaviourReview.grade),
            React.createElement(Text, { style: { fontSize: 9, color: '#64748b' } }, `${r.behaviourReview.panicsAvoided} panics avoided`),
          ),
        ),
        React.createElement(Text, { style: styles.body }, r.behaviourReview.bestDecision),
        React.createElement(Text, { style: [styles.body, { marginTop: 6, color: '#64748b' }] }, `Improve: ${r.behaviourReview.improvementArea}`),
      ),
    ),

    // ── Page 5: Rebalance Plan ────────────────────────────────────────────
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Rebalance Recommendations'),
        React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 } },
          React.createElement(View, { style: [styles.gradeBadge, { backgroundColor: r.rebalanceRecommendations.rebalanceNeeded ? '#fef3c7' : '#f0fdf4' }] },
            React.createElement(Text, { style: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: r.rebalanceRecommendations.rebalanceNeeded ? '#b45309' : '#15803d' } },
              r.rebalanceRecommendations.rebalanceNeeded ? `⚠ Rebalance: ${r.rebalanceRecommendations.urgency.replace('_', ' ')}` : '✓ No rebalancing needed',
            ),
          ),
        ),
        React.createElement(Text, { style: styles.body }, r.rebalanceRecommendations.rebalanceSummary),
        r.rebalanceRecommendations.actions.length > 0 && React.createElement(View, { style: { marginTop: 14 } },
          ...r.rebalanceRecommendations.actions.map((a) => React.createElement(View, {
            key: a.asset,
            style: { backgroundColor: '#f8fafc', borderRadius: 6, padding: 10, marginBottom: 8, borderLeft: `3 solid ${a.action === 'exit' ? '#dc2626' : a.action === 'increase' || a.action === 'add' ? '#16a34a' : '#f59e0b'}` },
          },
            React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 } },
              React.createElement(Text, { style: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' } }, a.asset),
              React.createElement(Text, { style: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: a.action === 'exit' ? '#dc2626' : '#16a34a' } }, a.action.toUpperCase()),
            ),
            React.createElement(Text, { style: { fontSize: 9, color: '#64748b' } }, `${a.currentWeight} → ${a.targetWeight}`),
            React.createElement(Text, { style: { fontSize: 9, color: '#374151', marginTop: 4 } }, a.reasoning),
          )),
        ) as ReturnType<typeof React.createElement>,
      ),
    ),

    // ── Page 6: Next Quarter Outlook ──────────────────────────────────────
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Next Quarter Outlook'),
        React.createElement(Text, { style: styles.body }, r.nextQuarterOutlook.marketOutlook),
        React.createElement(Text, { style: [styles.sectionSub, { marginTop: 12, fontFamily: 'Helvetica-Bold' }] }, `Sector to Watch: ${r.nextQuarterOutlook.sectorToWatch}`),
        React.createElement(Text, { style: [styles.sectionSub, { marginTop: 12, fontFamily: 'Helvetica-Bold' }] }, 'Your Personal Action Plan'),
        ...r.nextQuarterOutlook.personalPlan.map((p, i) => React.createElement(View, { style: styles.row, key: i },
          React.createElement(View, { style: [styles.dot, styles.actionDot] }),
          React.createElement(Text, { style: styles.body }, p),
        )),
      ),
      React.createElement(View, { style: [styles.section, { backgroundColor: '#f0f9ff' }] },
        React.createElement(Text, { style: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1A56DB', marginBottom: 8 } }, "ARIA's Final Note"),
        React.createElement(Text, { style: styles.body }, "Investing is a long-term discipline. The best investors aren't the ones who make the most trades — they're the ones who stay the course through market cycles. Keep your SIPs running, review your thesis quarterly, and trust the process. ARIA is here every step of the way."),
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: { fontSize: 8, color: '#94a3b8', lineHeight: 1.5 } }, r.disclaimer),
      ),
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, `ARIA Research · ${r.reportTitle} · Generated ${new Date(r.generatedDate).toLocaleDateString('en-IN')}`),
      ),
    ),
  )

  const pdfDir = path.join('/tmp', 'reports')
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
  const filePath = path.join(pdfDir, `${userId}-${quarter}.pdf`)

  const buffer = await pdf(doc).toBuffer() as unknown as Buffer
  fs.writeFileSync(filePath, buffer)
  return filePath
}
