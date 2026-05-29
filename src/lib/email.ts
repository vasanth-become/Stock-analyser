/**
 * Email service via Resend.
 * All sends are best-effort — failures are logged but never thrown to callers.
 */

import { Resend } from 'resend'

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
      <p style="margin:0;color:#bfdbfe;font-size:13px;font-weight:600;letter-spacing:0.05em">STOCKANALYSER ALERT</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800">${symbol} Alert Triggered</h1>
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
        You're receiving this because you set a price alert on StockAnalyser.
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'}/dashboard/alerts"
          style="color:#3b82f6;text-decoration:none">Manage alerts</a>
      </p>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px">
        Not SEBI-registered advice. For educational purposes only.
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
      <p style="margin:0;color:#bfdbfe;font-size:13px;font-weight:600;letter-spacing:0.05em">WEEKLY MARKET DIGEST</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800">${weekRange}</h1>
    </div>

    <div style="padding:28px 32px;space-y:24px">
      <p style="margin:0 0 24px;color:#374151;font-size:15px">Hi ${name},<br>Here's your personalised market digest for the week.</p>

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
        <h2 style="margin:0 0 12px;color:#1d4ed8;font-size:15px;font-weight:700">✨ AI Pick of the Week</h2>
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
        Weekly digest from StockAnalyser ·
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'}/dashboard/alerts"
          style="color:#3b82f6;text-decoration:none">Manage preferences</a>
      </p>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px">
        Not SEBI-registered advice. For educational purposes only. Mutual fund investments are
        subject to market risks.
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
      subject: `📊 Your Weekly Market Digest — ${data.weekRange}`,
      html: digestHtml(data),
    })
    if (error) { console.error('[email] Digest send error:', error); return false }
    return true
  } catch (err) {
    console.error('[email] sendDigestEmail failed:', err)
    return false
  }
}
