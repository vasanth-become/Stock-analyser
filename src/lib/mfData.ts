/**
 * Mutual fund data service.
 * Live provider: mfapi.in (free, no auth required)
 * Fallback: deterministic mock data (used when network is unavailable)
 */

import { cacheGetOrSet } from './cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MutualFund {
  schemeCode: string
  schemeName: string
  amc: string
  category: string
  subCategory: string
  nav: number
  navDate: string
  return1y: number | null   // %
  return3y: number | null   // %
  return5y: number | null   // %
  expenseRatio: number | null  // %
  minSipAmount: number        // INR
  fundUrl: string             // AMC / external link
  riskLevel: 'Low' | 'Moderate' | 'High'
  aum: number | null          // crores
}

export interface MFSearchResult {
  schemeCode: string
  schemeName: string
  amc: string
}

// ─── Known large AMCs for mock data ──────────────────────────────────────────

const AMC_URLS: Record<string, string> = {
  'SBI Mutual Fund': 'https://www.sbimf.com',
  'HDFC Mutual Fund': 'https://www.hdfcfund.com',
  'ICICI Prudential': 'https://www.iciciprumf.com',
  'Axis Mutual Fund': 'https://www.axismf.com',
  'Mirae Asset': 'https://www.miraeassetmf.co.in',
  'Kotak Mutual Fund': 'https://www.kotakmf.com',
  'Nippon India': 'https://mf.nipponindiaim.com',
  'UTI Mutual Fund': 'https://www.utimf.com',
  'DSP Mutual Fund': 'https://www.dspim.com',
  'Parag Parikh': 'https://www.ppfas.com',
  'Quant Mutual Fund': 'https://www.quantmutual.com',
  'Canara Robeco': 'https://www.canararobeco.com',
}

// ─── Curated fund database (realistic Indian MF data) ────────────────────────
// Organised by category so the AI can pick by risk/goal alignment

const FUND_CATALOGUE: MutualFund[] = [
  // ── Equity – Large Cap ──────────────────────────────────────────────────────
  {
    schemeCode: '120503',
    schemeName: 'SBI Bluechip Fund - Direct Growth',
    amc: 'SBI Mutual Fund',
    category: 'Equity',
    subCategory: 'Large Cap',
    nav: 87.42,
    navDate: '2025-05-28',
    return1y: 18.4,
    return3y: 16.2,
    return5y: 19.8,
    expenseRatio: 0.82,
    minSipAmount: 500,
    fundUrl: 'https://www.sbimf.com/en-us/schemes/equity-funds/sbi-bluechip-fund',
    riskLevel: 'Moderate',
    aum: 42850,
  },
  {
    schemeCode: '100016',
    schemeName: 'HDFC Top 100 Fund - Direct Growth',
    amc: 'HDFC Mutual Fund',
    category: 'Equity',
    subCategory: 'Large Cap',
    nav: 1024.78,
    navDate: '2025-05-28',
    return1y: 22.1,
    return3y: 18.6,
    return5y: 21.3,
    expenseRatio: 0.93,
    minSipAmount: 100,
    fundUrl: 'https://www.hdfcfund.com/our-products/equities/hdfc-top-100-fund',
    riskLevel: 'Moderate',
    aum: 35200,
  },
  {
    schemeCode: '112090',
    schemeName: 'Mirae Asset Large Cap Fund - Direct Growth',
    amc: 'Mirae Asset',
    category: 'Equity',
    subCategory: 'Large Cap',
    nav: 112.56,
    navDate: '2025-05-28',
    return1y: 21.3,
    return3y: 17.8,
    return5y: 20.9,
    expenseRatio: 0.54,
    minSipAmount: 1000,
    fundUrl: 'https://www.miraeassetmf.co.in/funds/equity-funds/mirae-asset-large-cap-fund',
    riskLevel: 'Moderate',
    aum: 38100,
  },
  // ── Equity – Flexi Cap ──────────────────────────────────────────────────────
  {
    schemeCode: '122639',
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Growth',
    amc: 'Parag Parikh',
    category: 'Equity',
    subCategory: 'Flexi Cap',
    nav: 82.34,
    navDate: '2025-05-28',
    return1y: 23.7,
    return3y: 19.4,
    return5y: 26.1,
    expenseRatio: 0.63,
    minSipAmount: 1000,
    fundUrl: 'https://www.ppfas.com/funds/parag-parikh-flexi-cap-fund/',
    riskLevel: 'Moderate',
    aum: 67400,
  },
  {
    schemeCode: '101506',
    schemeName: 'HDFC Flexi Cap Fund - Direct Growth',
    amc: 'HDFC Mutual Fund',
    category: 'Equity',
    subCategory: 'Flexi Cap',
    nav: 1756.42,
    navDate: '2025-05-28',
    return1y: 24.6,
    return3y: 22.1,
    return5y: 24.8,
    expenseRatio: 0.75,
    minSipAmount: 100,
    fundUrl: 'https://www.hdfcfund.com/our-products/equities/hdfc-flexi-cap-fund',
    riskLevel: 'Moderate',
    aum: 54300,
  },
  // ── Equity – Mid Cap ────────────────────────────────────────────────────────
  {
    schemeCode: '120508',
    schemeName: 'Axis Midcap Fund - Direct Growth',
    amc: 'Axis Mutual Fund',
    category: 'Equity',
    subCategory: 'Mid Cap',
    nav: 103.18,
    navDate: '2025-05-28',
    return1y: 28.4,
    return3y: 21.3,
    return5y: 28.9,
    expenseRatio: 0.55,
    minSipAmount: 500,
    fundUrl: 'https://www.axismf.com/mutual-fund/axis-midcap-fund',
    riskLevel: 'High',
    aum: 24600,
  },
  {
    schemeCode: '135781',
    schemeName: 'Kotak Emerging Equity Fund - Direct Growth',
    amc: 'Kotak Mutual Fund',
    category: 'Equity',
    subCategory: 'Mid Cap',
    nav: 147.62,
    navDate: '2025-05-28',
    return1y: 31.2,
    return3y: 24.7,
    return5y: 30.4,
    expenseRatio: 0.46,
    minSipAmount: 100,
    fundUrl: 'https://www.kotakmf.com/Products/Mutual-fund/Details/Kotak-Emerging-Equity-Fund',
    riskLevel: 'High',
    aum: 36500,
  },
  // ── Equity – Small Cap ──────────────────────────────────────────────────────
  {
    schemeCode: '125497',
    schemeName: 'Nippon India Small Cap Fund - Direct Growth',
    amc: 'Nippon India',
    category: 'Equity',
    subCategory: 'Small Cap',
    nav: 184.93,
    navDate: '2025-05-28',
    return1y: 38.6,
    return3y: 32.4,
    return5y: 37.2,
    expenseRatio: 0.68,
    minSipAmount: 100,
    fundUrl: 'https://mf.nipponindiaim.com/FundDetails/nippon-india-small-cap-fund',
    riskLevel: 'High',
    aum: 48200,
  },
  {
    schemeCode: '148618',
    schemeName: 'Quant Small Cap Fund - Direct Growth',
    amc: 'Quant Mutual Fund',
    category: 'Equity',
    subCategory: 'Small Cap',
    nav: 301.47,
    navDate: '2025-05-28',
    return1y: 42.1,
    return3y: 38.6,
    return5y: 44.8,
    expenseRatio: 0.64,
    minSipAmount: 1000,
    fundUrl: 'https://www.quantmutual.com/funds/quant-small-cap-fund',
    riskLevel: 'High',
    aum: 22300,
  },
  // ── Index / ETF ─────────────────────────────────────────────────────────────
  {
    schemeCode: '120716',
    schemeName: 'UTI Nifty 50 Index Fund - Direct Growth',
    amc: 'UTI Mutual Fund',
    category: 'Index',
    subCategory: 'Nifty 50',
    nav: 162.87,
    navDate: '2025-05-28',
    return1y: 17.8,
    return3y: 14.6,
    return5y: 17.3,
    expenseRatio: 0.17,
    minSipAmount: 500,
    fundUrl: 'https://www.utimf.com/funds/uti-nifty-50-index-fund',
    riskLevel: 'Moderate',
    aum: 18400,
  },
  {
    schemeCode: '118278',
    schemeName: 'ICICI Pru Nifty Next 50 Index Fund - Direct Growth',
    amc: 'ICICI Prudential',
    category: 'Index',
    subCategory: 'Nifty Next 50',
    nav: 52.34,
    navDate: '2025-05-28',
    return1y: 24.3,
    return3y: 18.9,
    return5y: 20.1,
    expenseRatio: 0.3,
    minSipAmount: 100,
    fundUrl: 'https://www.iciciprumf.com/app/en/our-products/mutual-fund/nifty-next-50-index-fund',
    riskLevel: 'Moderate',
    aum: 8200,
  },
  // ── Debt / Hybrid ────────────────────────────────────────────────────────────
  {
    schemeCode: '101305',
    schemeName: 'SBI Conservative Hybrid Fund - Direct Growth',
    amc: 'SBI Mutual Fund',
    category: 'Hybrid',
    subCategory: 'Conservative Hybrid',
    nav: 64.21,
    navDate: '2025-05-28',
    return1y: 11.4,
    return3y: 10.2,
    return5y: 11.8,
    expenseRatio: 0.74,
    minSipAmount: 500,
    fundUrl: 'https://www.sbimf.com',
    riskLevel: 'Low',
    aum: 9600,
  },
  {
    schemeCode: '120447',
    schemeName: 'HDFC Balanced Advantage Fund - Direct Growth',
    amc: 'HDFC Mutual Fund',
    category: 'Hybrid',
    subCategory: 'Balanced Advantage',
    nav: 498.73,
    navDate: '2025-05-28',
    return1y: 19.6,
    return3y: 17.4,
    return5y: 20.2,
    expenseRatio: 0.72,
    minSipAmount: 100,
    fundUrl: 'https://www.hdfcfund.com/our-products/hybrids/hdfc-balanced-advantage-fund',
    riskLevel: 'Moderate',
    aum: 87400,
  },
  {
    schemeCode: '100425',
    schemeName: 'DSP Equity & Bond Fund - Direct Growth',
    amc: 'DSP Mutual Fund',
    category: 'Hybrid',
    subCategory: 'Aggressive Hybrid',
    nav: 312.56,
    navDate: '2025-05-28',
    return1y: 20.3,
    return3y: 16.8,
    return5y: 19.4,
    expenseRatio: 0.82,
    minSipAmount: 500,
    fundUrl: 'https://www.dspim.com/Products/MutualFunds/dsp-equity-bond-fund',
    riskLevel: 'Moderate',
    aum: 10200,
  },
  // ── ELSS (Tax Saving) ────────────────────────────────────────────────────────
  {
    schemeCode: '120505',
    schemeName: 'Mirae Asset ELSS Tax Saver Fund - Direct Growth',
    amc: 'Mirae Asset',
    category: 'ELSS',
    subCategory: 'Tax Saver',
    nav: 48.92,
    navDate: '2025-05-28',
    return1y: 22.8,
    return3y: 18.6,
    return5y: 23.1,
    expenseRatio: 0.51,
    minSipAmount: 500,
    fundUrl: 'https://www.miraeassetmf.co.in/funds/equity-funds/mirae-asset-elss-tax-saver-fund',
    riskLevel: 'Moderate',
    aum: 24800,
  },
  {
    schemeCode: '119598',
    schemeName: 'Canara Robeco Equity Tax Saver - Direct Growth',
    amc: 'Canara Robeco',
    category: 'ELSS',
    subCategory: 'Tax Saver',
    nav: 163.42,
    navDate: '2025-05-28',
    return1y: 21.4,
    return3y: 17.9,
    return5y: 22.7,
    expenseRatio: 0.56,
    minSipAmount: 500,
    fundUrl: 'https://www.canararobeco.com/equity-tax-saver-fund',
    riskLevel: 'Moderate',
    aum: 7800,
  },
  // ── Debt ─────────────────────────────────────────────────────────────────────
  {
    schemeCode: '120575',
    schemeName: 'ICICI Pru Short Term Fund - Direct Growth',
    amc: 'ICICI Prudential',
    category: 'Debt',
    subCategory: 'Short Duration',
    nav: 54.18,
    navDate: '2025-05-28',
    return1y: 7.8,
    return3y: 6.9,
    return5y: 7.2,
    expenseRatio: 0.32,
    minSipAmount: 1000,
    fundUrl: 'https://www.iciciprumf.com/app/en/our-products/mutual-fund/icici-prudential-short-term-fund',
    riskLevel: 'Low',
    aum: 18600,
  },
]

// ─── Live mfapi.in fetch (best-effort) ───────────────────────────────────────

async function fetchLiveNav(schemeCode: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return parseFloat(data?.data?.[0]?.nav) || null
  } catch {
    return null
  }
}

async function searchMfApi(query: string): Promise<MFSearchResult[]> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data ?? []).slice(0, 10).map((f: { schemeCode: string; schemeName: string; amc: string }) => ({
      schemeCode: String(f.schemeCode),
      schemeName: f.schemeName,
      amc: f.amc,
    }))
  } catch {
    return []
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getFundCatalogue(): Promise<MutualFund[]> {
  return cacheGetOrSet('mf:catalogue', async () => {
    // Try enriching NAVs from live API, fall back to catalogue values
    const enriched = await Promise.all(
      FUND_CATALOGUE.map(async (f) => {
        const liveNav = await fetchLiveNav(f.schemeCode)
        return liveNav ? { ...f, nav: liveNav } : f
      }),
    )
    return enriched
  }, 3600) // 1 hour TTL
}

export async function searchFunds(query: string): Promise<MFSearchResult[]> {
  if (!query.trim()) return []
  return cacheGetOrSet(`mf:search:${query.toLowerCase()}`, () => searchMfApi(query), 300)
}

export function getFundsByCategory(
  catalogue: MutualFund[],
  category: string,
): MutualFund[] {
  return catalogue.filter((f) => f.category === category || f.subCategory === category)
}

export function getFundsByRisk(
  catalogue: MutualFund[],
  risk: 'Low' | 'Moderate' | 'High',
): MutualFund[] {
  return catalogue.filter((f) => f.riskLevel === risk)
}

export { AMC_URLS }
