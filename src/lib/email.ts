/**
 * Email service via Resend.
 * All sends are best-effort — failures are logged but never thrown to callers.
 */

import { Resend } from 'resend'
import type { MercuryOutput } from './digestEngine'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'StockAnalyser <alerts@stockanalyser.app>'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertEmailData {
  to: string
  name: string
  symbol: string
  exchange: string
  alertType: string
  threshold: number
  currentPrice: number
  currentChange?: number
}

export interface DigestEmailData {
  to: string
  name: string
  weekRange: string            // e.g. "26 May – 1 Jun 2025"
  indexSummary: { name: string; changePercent: number }[]
  watchlistItems: { symbol: string; companyName: string; changePercent: number }[]
  aiRecommendation: string     // Claude's one-paragraph weekly pick
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function changeColor(pct: number) {
  return pct >= 0 ? '#16a34a' : '#dc2626'
}

function changeArrow(pct: number) {
  return pct >= 0 ? '▲' : '▼'
}

// ─── Alert email ─────────────────────────────────────────────────────────────

function alertSubject(data: AlertEmailData): string {
  const { symbol, alertType, threshold } = data
  if (alertType === 'PRICE_ABOVE') return `🔔 ${symbol} crossed above ₹${threshold.toLocaleString('en-IN')}`
  if (alertType === 'PRICE_BELOW') return `🔔 ${symbol} dropped below ₹${threshold.toLocaleString('en-IN')}`
  return `🔔 ${symbol} moved ±${threshold}%`
}

function alertHtml(data: AlertEmailData): string {
  const { name, symbol, exchange, alertType, threshold, currentPrice, currentChange } = data
  const change = currentChange ?? 0
  const typeLabel =
    alertType === 'PRICE_ABOVE' ? `crossed above ${fmtINR(threshold)}`
    : alertType === 'PRICE_BELOW' ? `dropped below ${fmtINR(threshold)}`
    : `moved ${threshold >= 0 ? '+' : ''}${threshold}%`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 32px">
      <p style="margin:0;color:#bfdbfe;font-size:13px;font-weight:600;letter-spacing:0.05em">ARIA RESEARCH — PRICE ALERT</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800">${symbol} Price Alert Triggered</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px">
        Your alert for <strong>${symbol}</strong> (${exchange}) has been triggered — the stock ${typeLabel}.
      </p>

      <!-- Price card -->
      <div style="background:#f1f5f9;border-radius:10px;padding:20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Current Price</p>
            <p style="margin:6px 0 0;color:#0f172a;font-size:28px;font-weight:800">${fmtINR(currentPrice)}</p>
          </div>
          <div style="text-align:right">
            <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Today's Change</p>
            <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:${changeColor(change)}">
              ${changeArrow(change)} ${Math.abs(change).toFixed(2)}%
            </p>
          </div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0">
          <p style="margin:0;color:#64748b;font-size:13px">
            Alert threshold: <strong style="color:#1e293b">${fmtINR(threshold)}</strong>
            &nbsp;·&nbsp; Exchange: <strong style="color:#1e293b">${exchange}</strong>
          </p>
        </div>
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'}/stock/${symbol}"
        style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        View ${symbol} →
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px">
      <p style="margin:0;color:#94a3b8;font-size:12px">
        You're receiving this because you set a price alert on ARIA Research.
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'}/dashboard/alerts"
          style="color:#3b82f6;text-decoration:none">Manage alerts</a>
      </p>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px">
        Research output only. Not investment advice. ARIA Research is not registered with SEBI as a Research Analyst or Investment Adviser. Please do your own research before investing.
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─── Weekly digest email ──────────────────────────────────────────────────────

function digestRows(items: { symbol: string; companyName: string; changePercent: number }[]): string {
  if (!items.length) return '<p style="color:#64748b;font-size:14px">No watchlist stocks tracked this week.</p>'
  return items.map((s) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
        <span style="font-weight:700;color:#0f172a">${s.symbol}</span>
        <span style="color:#64748b;font-size:13px;margin-left:8px">${s.companyName}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${changeColor(s.changePercent)}">
        ${changeArrow(s.changePercent)} ${Math.abs(s.changePercent).toFixed(2)}%
      </td>
    </tr>`).join('')
}

function indexRows(items: { name: string; changePercent: number }[]): string {
  return items.map((idx) => `
    <div style="display:inline-block;background:#f8fafc;border-radius:8px;padding:12px 16px;margin:4px;text-align:center;min-width:100px">
      <p style="margin:0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">${idx.name}</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:${changeColor(idx.changePercent)}">
        ${changeArrow(idx.changePercent)} ${Math.abs(idx.changePercent).toFixed(2)}%
      </p>
    </div>`).join('')
}

function digestHtml(data: DigestEmailData): string {
  const { name, weekRange, indexSummary, watchlistItems, aiRecommendation } = data
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 32px">
      <p style="margin:0;color:#bfdbfe;font-size:13px;font-weight:600;letter-spacing:0.05em">ARIA RESEARCH WEEKLY | YOUR PERSONALISED MARKET RESEARCH DIGEST</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800">${weekRange}</h1>
    </div>

    <div style="padding:28px 32px;space-y:24px">
      <p style="margin:0 0 24px;color:#374151;font-size:15px">Hi ${name},<br>Here is your personalised market research digest — every Monday.</p>

      <!-- Index summary -->
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:700">📈 Market Performance</h2>
      <div style="margin-bottom:28px">${indexRows(indexSummary)}</div>

      <!-- Watchlist -->
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:700">📋 Your Watchlist</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <tbody>${digestRows(watchlistItems)}</tbody>
      </table>

      <!-- AI Pick of the week -->
      <div style="background:linear-gradient(135deg,#eff6ff,#f5f3ff);border:1px solid #dbeafe;border-radius:10px;padding:20px;margin-bottom:28px">
        <h2 style="margin:0 0 12px;color:#1d4ed8;font-size:15px;font-weight:700">✨ This week's research spotlight</h2>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.7">${aiRecommendation}</p>
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'}/dashboard"
        style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Open Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px">
      <p style="margin:0;color:#94a3b8;font-size:12px">
        ARIA Research Weekly —
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'}/dashboard/alerts"
          style="color:#3b82f6;text-decoration:none">Manage preferences</a>
        · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'}/dashboard" style="color:#3b82f6;text-decoration:none">View in browser</a>
      </p>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px">
        This email is sent by ARIA Research, an AI-powered investment research platform. We are not registered with SEBI as a Research Analyst or Investment Adviser. Content in this email is for informational and educational purposes only and does not constitute investment advice or a solicitation to buy or sell any securities. Investments are subject to market risks. Past performance is not indicative of future results. Mutual fund investments are subject to market risks — please read all scheme-related documents carefully before investing.
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─── Public send functions ────────────────────────────────────────────────────

export async function sendAlertEmail(data: AlertEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — skipping alert email for', data.symbol)
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: alertSubject(data),
      html: alertHtml(data),
    })
    if (error) { console.error('[email] Alert send error:', error); return false }
    return true
  } catch (err) {
    console.error('[email] sendAlertEmail failed:', err)
    return false
  }
}

export async function sendDigestEmail(data: DigestEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — skipping digest email for', data.to)
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `ARIA Research Weekly | ${data.weekRange}`,
      html: digestHtml(data),
    })
    if (error) { console.error('[email] Digest send error:', error); return false }
    return true
  } catch (err) {
    console.error('[email] sendDigestEmail failed:', err)
    return false
  }
}

// ─── Mercury digest email (Module 8) ─────────────────────────────────────────

function mercuryHtml(to: string, output: MercuryOutput): string {
  const { sections, footer, emailMetadata } = output
  const pulse = sections.weeklyPulse
  const portfolio = sections.yourPortfolioThisWeek
  const spotlight = sections.weeklySpotlight
  const lastPick = sections.lastPickReview
  const learn = sections.learnThisWeek
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'

  const sectorRows = pulse.sectorSummary.map((s) => {
    const positive = s.change.startsWith('+')
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#374151;font-size:14px;font-weight:600">${s.sector}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-weight:700;color:${positive ? '#16a34a' : '#dc2626'};text-align:center">${s.change}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">${s.reason}</td>
    </tr>`
  }).join('')

  const watchlistRows = portfolio.watchlistMovers.map((m) => {
    const positive = m.change.startsWith('+')
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-weight:700;color:#0f172a">${m.ticker}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-weight:700;color:${positive ? '#16a34a' : '#dc2626'};text-align:center">${m.change}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">${m.note}</td>
    </tr>`
  }).join('')

  const radarItems = sections.onYourRadar.map((r) =>
    `<li style="margin-bottom:10px;color:#374151;font-size:14px;line-height:1.6">
      <strong>${r.item}</strong> — ${r.why}
    </li>`,
  ).join('')

  const lastPickHtml = lastPick ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px">
      <h2 style="margin:0 0 12px;color:#15803d;font-size:15px;font-weight:700">${lastPick.headline}</h2>
      <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">
        <span style="font-size:13px;color:#64748b">Recommended at <strong>₹${lastPick.recommendedPrice.toLocaleString('en-IN')}</strong></span>
        <span style="font-size:13px;color:#64748b">Now <strong>₹${lastPick.currentPrice.toLocaleString('en-IN')}</strong></span>
        <span style="font-size:14px;font-weight:700;color:${lastPick.change.startsWith('+') ? '#16a34a' : '#dc2626'}">${lastPick.change}</span>
      </div>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7">${lastPick.thesisUpdate}</p>
      <span style="background:#15803d;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">${lastPick.action}</span>
    </div>` : ''

  const learnHtml = learn ? `
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:20px;margin-bottom:24px">
      <h2 style="margin:0 0 10px;color:#92400e;font-size:15px;font-weight:700">💡 Learn this week: ${learn.concept}</h2>
      <p style="margin:0;color:#78350f;font-size:14px;line-height:1.7">${learn.explanation}</p>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${emailMetadata.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${emailMetadata.previewText}</div>

  <div style="max-width:620px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 32px">
      <p style="margin:0;color:#bfdbfe;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">ARIA RESEARCH WEEKLY | MERCURY MARKET RESEARCH DIGEST</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:800">${emailMetadata.weekRange}</h1>
      <p style="margin:8px 0 0;color:#c7d2fe;font-size:13px">${emailMetadata.previewText}</p>
    </div>

    <div style="padding:28px 32px">

      <!-- Section 1: Weekly Pulse -->
      <h2 style="margin:0 0 10px;color:#0f172a;font-size:17px;font-weight:800">📈 ${pulse.headline}</h2>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.7">${pulse.body}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr>
            <th style="text-align:left;padding:0 0 8px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Sector</th>
            <th style="text-align:center;padding:0 0 8px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Week</th>
            <th style="text-align:left;padding:0 4px 8px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Why</th>
          </tr>
        </thead>
        <tbody>${sectorRows}</tbody>
      </table>

      <div style="background:#f1f5f9;border-radius:8px;padding:14px 16px;margin-bottom:28px">
        <p style="margin:0;font-size:13px;color:#374151"><strong>Macro:</strong> ${pulse.keyMacroEvent.event} — ${pulse.keyMacroEvent.implication}</p>
      </div>

      <!-- Section 2: Your Portfolio -->
      <h2 style="margin:0 0 10px;color:#0f172a;font-size:17px;font-weight:800">📋 ${portfolio.headline}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr>
            <th style="text-align:left;padding:0 0 8px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase">Stock</th>
            <th style="text-align:center;padding:0 0 8px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase">Change</th>
            <th style="text-align:left;padding:0 0 8px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase">Note</th>
          </tr>
        </thead>
        <tbody>${watchlistRows}</tbody>
      </table>
      ${portfolio.holdingsPnL ? `
      <div style="background:#f0f9ff;border-radius:8px;padding:12px 16px;margin-bottom:12px">
        <p style="margin:0;font-size:14px;color:#0369a1">
          <strong>Holdings P&amp;L this week:</strong> ${portfolio.holdingsPnL.weeklyPnLChange} — ${portfolio.holdingsPnL.note}
        </p>
      </div>` : ''}
      ${portfolio.sipNote ? `<p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;font-style:italic">${portfolio.sipNote}</p>` : '<div style="margin-bottom:24px"></div>'}

      <!-- Section 3: Last Pick Review -->
      ${lastPickHtml}

      <!-- Section 4: This Week's Spotlight -->
      <div style="background:linear-gradient(135deg,#eff6ff,#f5f3ff);border:1px solid #dbeafe;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 6px;color:#6d28d9;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">THIS WEEK'S RESEARCH SPOTLIGHT</p>
        <h2 style="margin:0 0 12px;color:#1d4ed8;font-size:16px;font-weight:800">${spotlight.headline}</h2>
        <div style="display:flex;gap:20px;margin-bottom:14px;flex-wrap:wrap">
          <span style="font-size:13px;color:#374151">Current: <strong>₹${spotlight.currentPrice.toLocaleString('en-IN')}</strong></span>
          <span style="font-size:13px;color:#374151">Entry zone: <strong>${spotlight.entryRange}</strong></span>
          <span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600">${spotlight.type}</span>
        </div>
        <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7">${spotlight.reasoning}</p>
        <p style="margin:0 0 12px;color:#64748b;font-size:13px"><strong>Watch out:</strong> ${spotlight.watchOut}</p>
        <p style="margin:0;color:#1d4ed8;font-size:14px;font-weight:600">Suggested: ${spotlight.suggestedAmount}</p>
      </div>

      <!-- Section 5: On Your Radar -->
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:17px;font-weight:800">🔭 On your radar this week</h2>
      <ul style="margin:0 0 28px;padding-left:20px">${radarItems}</ul>

      <!-- Section 6: Learn This Week (beginner only) -->
      ${learnHtml}

      <a href="${appUrl}/dashboard"
        style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;margin-bottom:8px">
        Open Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px">
      <p style="margin:0 0 6px;color:#94a3b8;font-size:12px">${footer.disclaimer}</p>
      <p style="margin:0;color:#cbd5e1;font-size:11px">${footer.unsubscribeNote}</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendMercuryDigestEmail(
  to: string,
  output: MercuryOutput,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — skipping Mercury digest for', to)
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: output.emailMetadata.subject,
      html: mercuryHtml(to, output),
    })
    if (error) { console.error('[email] Mercury digest send error:', error); return false }
    return true
  } catch (err) {
    console.error('[email] sendMercuryDigestEmail failed:', err)
    return false
  }
}

// ─── Behaviour Guard Alert Email ──────────────────────────────────────────────

import type { CalmMessage } from './behaviourGuard/calmMessageGenerator'

export interface BehaviourGuardEmailData {
  to: string
  name: string
  alertId: string
  calmMessage: CalmMessage
  niftyChange: number
  crashLevel: 'yellow' | 'orange' | 'red'
}

const CRASH_LEVEL_COLOURS: Record<string, { bg: string; text: string; label: string }> = {
  yellow: { bg: '#fef9c3', text: '#854d0e', label: 'Choppy Session' },
  orange: { bg: '#ffedd5', text: '#9a3412', label: 'Broad Selling' },
  red:    { bg: '#fee2e2', text: '#991b1b', label: 'Sharp Correction' },
}

function behaviourGuardHtml(data: BehaviourGuardEmailData): string {
  const { name, alertId, calmMessage, niftyChange, crashLevel } = data
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'
  const colours = CRASH_LEVEL_COLOURS[crashLevel]

  const stockRows = calmMessage.stockAnalysis.map((s) => {
    const statusColor =
      s.thesisStatus === 'intact' ? '#16a34a' :
      s.thesisStatus === 'weakening' ? '#d97706' : '#dc2626'
    return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="min-width:60px">
            <p style="margin:0;font-size:15px;font-weight:800;color:#0f172a">${s.ticker}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#dc2626;font-weight:600">${s.drop}</p>
          </div>
          <div>
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${statusColor}20;color:${statusColor};text-transform:uppercase;margin-bottom:6px">${s.thesisStatus}</span>
            <p style="margin:0;font-size:13px;color:#374151;line-height:1.5">${s.fundamentalUpdate}</p>
          </div>
        </div>
      </td>
    </tr>`
  }).join('')

  const actionPoints = calmMessage.actionPlan.split('|').map(
    (pt) => `<li style="margin-bottom:8px;color:#374151;font-size:14px;line-height:1.6">${pt.trim()}</li>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

    <!-- Header — calming blue, NOT red -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);padding:28px 32px">
      <p style="margin:0 0 6px;color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:0.08em">🛡️ ARIA BEHAVIOUR GUARD</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;line-height:1.3">${calmMessage.headline}</h1>
    </div>

    <!-- Crash level badge -->
    <div style="background:${colours.bg};padding:10px 32px">
      <p style="margin:0;color:${colours.text};font-size:13px;font-weight:600">
        Nifty 50: <strong>${niftyChange.toFixed(2)}%</strong> &nbsp;·&nbsp; ${colours.label}
      </p>
    </div>

    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px">Hi ${name},</p>

      <!-- Market context -->
      <div style="background:#f0f7ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.7">${calmMessage.marketContext}</p>
      </div>

      <!-- Stock analysis -->
      ${calmMessage.stockAnalysis.length > 0 ? `
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:800">Your Watchlist Today</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${stockRows}</table>
      ` : ''}

      <!-- Action plan -->
      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 12px;color:#1e293b;font-size:14px;font-weight:700">📋 Your Calm Action Plan</p>
        <ul style="margin:0;padding-left:20px">${actionPoints}</ul>
      </div>

      <!-- Grounding question -->
      <div style="background:#fef3c7;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;color:#92400e;font-size:14px;font-weight:600">🤔 Before you do anything, ask yourself:</p>
        <p style="margin:8px 0 0;color:#78350f;font-size:15px;font-style:italic">"${calmMessage.groundingQuestion}"</p>
      </div>

      <!-- CTA buttons -->
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <a href="${appUrl}/api/behaviour/response?alertId=${alertId}&response=stay_course&redirect=1"
          style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:700">
          ✅ I'm staying the course
        </a>
        <a href="${appUrl}/api/behaviour/response?alertId=${alertId}&response=research_more&redirect=1"
          style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:700">
          🔍 I need to research more
        </a>
      </div>

      <!-- Behaviour tip -->
      <p style="margin:0;color:#64748b;font-size:13px;font-style:italic;border-top:1px solid #f1f5f9;padding-top:16px">
        💡 ${calmMessage.behaviourTip}
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px">
      <p style="margin:0 0 6px;color:#94a3b8;font-size:12px">
        <a href="${appUrl}/dashboard/behaviour" style="color:#3b82f6;text-decoration:none">View your Behaviour Dashboard</a>
        &nbsp;·&nbsp;
        <a href="${appUrl}/dashboard/alerts" style="color:#3b82f6;text-decoration:none">Manage alerts</a>
      </p>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px">
        ARIA Research is not a SEBI-registered adviser. Research outputs are for educational purposes only. Always consult a qualified financial adviser before making investment decisions.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendBehaviourGuardAlert(data: BehaviourGuardEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — skipping behaviour guard alert for', data.to)
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `🛡️ ARIA Behaviour Guard | Markets are down — read this before you do anything`,
      html: behaviourGuardHtml(data),
    })
    if (error) { console.error('[email] Behaviour guard send error:', error); return false }
    return true
  } catch (err) {
    console.error('[email] sendBehaviourGuardAlert failed:', err)
    return false
  }
}
