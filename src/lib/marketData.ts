/**
 * Market data service for Indian stocks (NSE / BSE).
 *
 * Live provider: yahoo-finance2  (suffix .NS for NSE, .BO for BSE)
 * Fallback:      deterministic mock data (used when network is unavailable)
 *
 * All results are cached with a 15-minute TTL (or 1-min for indices).
 */

import { cacheGetOrSet } from './cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockQuote {
  symbol: string
  exchange: 'NSE' | 'BSE'
  companyName: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  volume: number
  avgVolume: number
  week52High: number
  week52Low: number
  marketCap: number | null
  timestamp: string
}

export interface StockFundamentals {
  symbol: string
  pe: number | null
  eps: number | null
  marketCap: number | null
  dividendYield: number | null
  bookValue: number | null
  priceToBook: number | null
  beta: number | null
  roe: number | null
  sector: string | null
}

export interface IndexQuote {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
}

export interface SectorPerformance {
  sector: string
  index: string
  value: number
  change: number
  changePercent: number
  color: 'green' | 'red' | 'neutral'
}

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

export interface MarketMover {
  symbol: string
  companyName: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_QUOTE = 15 * 60       // 15 min
const CACHE_TTL_INDEX = 60            // 1 min — indices refresh faster
const CACHE_TTL_MOVERS = 15 * 60

// NSE suffix for Yahoo Finance
const NSE = (sym: string) => `${sym}.NS`

// NIFTY 50 constituents — used for computing top movers
const NIFTY50 = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'KOTAKBANK',
  'SBIN', 'BHARTIARTL', 'ITC', 'BAJFINANCE', 'AXISBANK', 'LT', 'ASIANPAINT',
  'MARUTI', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'NESTLEIND', 'WIPRO',
  'HCLTECH', 'POWERGRID', 'TECHM', 'NTPC', 'COALINDIA', 'BAJAJ-AUTO',
  'ONGC', 'DIVISLAB', 'TATAMOTORS', 'TATASTEEL', 'JSWSTEEL', 'ADANIENT',
  'ADANIPORTS', 'CIPLA', 'DRREDDY', 'EICHERMOT', 'BPCL', 'GRASIM',
  'HEROMOTOCO', 'HINDALCO', 'INDUSINDBK', 'M&M', 'SBILIFE', 'BAJAJFINSV',
  'BRITANNIA', 'APOLLOHOSP', 'HDFCLIFE', 'UPL', 'TATACONSUM', 'DMART',
]

const INDEX_MAP: Record<string, string> = {
  '^NSEI':    'NIFTY 50',
  '^BSESN':   'SENSEX',
  '^NSEBANK': 'NIFTY BANK',
  '^CNXIT':   'NIFTY IT',
}

const SECTOR_MAP: Array<{ index: string; yahoo: string; sector: string }> = [
  { index: 'NIFTY IT',       yahoo: '^CNXIT',      sector: 'IT' },
  { index: 'NIFTY BANK',     yahoo: '^NSEBANK',    sector: 'Banking' },
  { index: 'NIFTY PHARMA',   yahoo: '^CNXPHARMA',  sector: 'Pharma' },
  { index: 'NIFTY AUTO',     yahoo: '^CNXAUTO',    sector: 'Auto' },
  { index: 'NIFTY FMCG',     yahoo: '^CNXFMCG',   sector: 'FMCG' },
  { index: 'NIFTY ENERGY',   yahoo: '^CNXENERGY',  sector: 'Energy' },
  { index: 'NIFTY INFRA',    yahoo: '^CNXINFRA',   sector: 'Infrastructure' },
  { index: 'NIFTY METAL',    yahoo: '^CNXMETAL',   sector: 'Metals' },
  { index: 'NIFTY REALTY',   yahoo: '^CNXREALTY',  sector: 'Realty' },
  { index: 'NIFTY FIN SVC',  yahoo: '^CNXFINANCE', sector: 'Finance' },
]

// ─── Yahoo Finance client (singleton) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _yf: any = null

async function getYF() {
  if (_yf) return _yf
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YahooFinance = require('yahoo-finance2').default
  _yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })
  return _yf
}

// ─── Deterministic mock helpers (fallback when live API is unavailable) ───────

function seed(str: string): number {
  return str.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)
}

function pseudoRandom(s: number, salt = 0): number {
  const x = Math.sin(s + salt) * 10_000
  return x - Math.floor(x)
}

const COMPANY_NAMES: Record<string, string> = {
  RELIANCE: 'Reliance Industries', TCS: 'Tata Consultancy Services',
  HDFCBANK: 'HDFC Bank', INFY: 'Infosys', ICICIBANK: 'ICICI Bank',
  HINDUNILVR: 'Hindustan Unilever', KOTAKBANK: 'Kotak Mahindra Bank',
  SBIN: 'State Bank of India', BHARTIARTL: 'Bharti Airtel', ITC: 'ITC Limited',
  BAJFINANCE: 'Bajaj Finance', AXISBANK: 'Axis Bank', LT: 'Larsen & Toubro',
  ASIANPAINT: 'Asian Paints', MARUTI: 'Maruti Suzuki', SUNPHARMA: 'Sun Pharma',
  TITAN: 'Titan Company', ULTRACEMCO: 'UltraTech Cement', NESTLEIND: 'Nestle India',
  WIPRO: 'Wipro', HCLTECH: 'HCL Technologies', POWERGRID: 'Power Grid Corp',
  TECHM: 'Tech Mahindra', NTPC: 'NTPC', COALINDIA: 'Coal India',
  TATAMOTORS: 'Tata Motors', TATASTEEL: 'Tata Steel', JSWSTEEL: 'JSW Steel',
  ADANIENT: 'Adani Enterprises', ADANIPORTS: 'Adani Ports', CIPLA: 'Cipla',
  DRREDDY: "Dr. Reddy's", EICHERMOT: 'Eicher Motors', BPCL: 'BPCL',
  HEROMOTOCO: 'Hero MotoCorp', HINDALCO: 'Hindalco', M_M: 'Mahindra & Mahindra',
  DMART: 'Avenue Supermarts', BAJAJ_AUTO: 'Bajaj Auto',
}

function mockQuote(symbol: string, exchange: 'NSE' | 'BSE' = 'NSE'): StockQuote {
  const s = Math.abs(seed(symbol))
  const dayOffset = Math.floor(Date.now() / 86_400_000) // changes daily
  const base = 100 + (s % 4_900)
  const changePct = (pseudoRandom(s, dayOffset) - 0.48) * 8  // -3.84% to +3.84%
  const change = (base * changePct) / 100
  const vol = 500_000 + (s % 20_000_000)

  return {
    symbol,
    exchange,
    companyName: COMPANY_NAMES[symbol] ?? `${symbol} Limited`,
    price: parseFloat(base.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePct.toFixed(2)),
    open: parseFloat((base * (1 - pseudoRandom(s, 1) * 0.01)).toFixed(2)),
    high: parseFloat((base * (1 + pseudoRandom(s, 2) * 0.015)).toFixed(2)),
    low: parseFloat((base * (1 - pseudoRandom(s, 3) * 0.015)).toFixed(2)),
    previousClose: parseFloat((base - change).toFixed(2)),
    volume: vol,
    avgVolume: Math.floor(vol * 0.9),
    week52High: parseFloat((base * 1.35).toFixed(2)),
    week52Low: parseFloat((base * 0.65).toFixed(2)),
    marketCap: Math.floor(base * 1e9 * (1 + s % 50)),
    timestamp: new Date().toISOString(),
  }
}

function mockIndex(symbol: string, name: string): IndexQuote {
  const s = Math.abs(seed(symbol))
  const dayOffset = Math.floor(Date.now() / 86_400_000)
  const baseValues: Record<string, number> = {
    '^NSEI': 22_456, '^BSESN': 73_961, '^NSEBANK': 48_201, '^CNXIT': 34_567,
    '^CNXPHARMA': 18_234, '^CNXAUTO': 21_890, '^CNXFMCG': 54_321,
    '^CNXENERGY': 41_250, '^CNXINFRA': 8_901, '^CNXMETAL': 9_123,
    '^CNXREALTY': 7_456, '^CNXFINANCE': 22_100,
  }
  const base = baseValues[symbol] ?? 15_000
  const changePct = (pseudoRandom(s, dayOffset) - 0.48) * 3
  const change = (base * changePct) / 100

  return {
    symbol,
    name,
    value: parseFloat(base.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePct.toFixed(2)),
  }
}

// ─── Core fetchers ────────────────────────────────────────────────────────────

async function fetchQuoteFromYahoo(symbol: string, exchange: 'NSE' | 'BSE'): Promise<StockQuote> {
  const ticker = exchange === 'NSE' ? NSE(symbol) : `${symbol}.BO`
  const yf = await getYF()
  const r = await yf.quote(ticker)

  return {
    symbol,
    exchange,
    companyName: r.shortName ?? r.longName ?? `${symbol} Limited`,
    price: r.regularMarketPrice ?? 0,
    change: r.regularMarketChange ?? 0,
    changePercent: r.regularMarketChangePercent ?? 0,
    open: r.regularMarketOpen ?? 0,
    high: r.regularMarketDayHigh ?? 0,
    low: r.regularMarketDayLow ?? 0,
    previousClose: r.regularMarketPreviousClose ?? 0,
    volume: r.regularMarketVolume ?? 0,
    avgVolume: r.averageDailyVolume3Month ?? 0,
    week52High: r.fiftyTwoWeekHigh ?? 0,
    week52Low: r.fiftyTwoWeekLow ?? 0,
    marketCap: r.marketCap ?? null,
    timestamp: new Date().toISOString(),
  }
}

async function fetchIndexFromYahoo(symbol: string, name: string): Promise<IndexQuote> {
  const yf = await getYF()
  const r = await yf.quote(symbol)
  return {
    symbol,
    name,
    value: r.regularMarketPrice ?? 0,
    change: r.regularMarketChange ?? 0,
    changePercent: r.regularMarketChangePercent ?? 0,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getStockQuote(
  symbol: string,
  exchange: 'NSE' | 'BSE' = 'NSE',
): Promise<StockQuote> {
  return cacheGetOrSet(
    `quote:${exchange}:${symbol}`,
    async () => {
      try {
        return await fetchQuoteFromYahoo(symbol, exchange)
      } catch {
        return mockQuote(symbol, exchange)
      }
    },
    CACHE_TTL_QUOTE,
  )
}

export async function getStockFundamentals(
  symbol: string,
  exchange: 'NSE' | 'BSE' = 'NSE',
): Promise<StockFundamentals> {
  return cacheGetOrSet(
    `fundamentals:${exchange}:${symbol}`,
    async () => {
      try {
        const ticker = exchange === 'NSE' ? NSE(symbol) : `${symbol}.BO`
        const yf = await getYF()
        const r = await yf.quote(ticker)
        return {
          symbol,
          pe: r.trailingPE ?? null,
          eps: r.epsTrailingTwelveMonths ?? null,
          marketCap: r.marketCap ?? null,
          dividendYield: r.trailingAnnualDividendYield
            ? r.trailingAnnualDividendYield * 100
            : null,
          bookValue: r.bookValue ?? null,
          priceToBook: r.priceToBook ?? null,
          beta: r.beta ?? null,
          roe: null, // not in basic quote; needs quoteSummary financialData
          sector: null,
        }
      } catch {
        // Deterministic mock fundamentals
        const s = Math.abs(seed(symbol))
        return {
          symbol,
          pe: parseFloat((10 + (s % 40)).toFixed(1)),
          eps: parseFloat((5 + (s % 95)).toFixed(2)),
          marketCap: Math.floor(1e11 + (s % 1e13)),
          dividendYield: parseFloat((pseudoRandom(s) * 4).toFixed(2)),
          bookValue: parseFloat((50 + (s % 950)).toFixed(2)),
          priceToBook: parseFloat((1 + pseudoRandom(s, 7) * 8).toFixed(2)),
          beta: parseFloat((0.5 + pseudoRandom(s, 8) * 1.5).toFixed(2)),
          roe: parseFloat((8 + pseudoRandom(s, 9) * 25).toFixed(1)),
          sector: null,
        }
      }
    },
    CACHE_TTL_QUOTE,
  )
}

export async function getIndexQuotes(): Promise<IndexQuote[]> {
  return cacheGetOrSet(
    'indices:all',
    async () => {
      const results = await Promise.allSettled(
        Object.entries(INDEX_MAP).map(async ([yahoo, name]) => {
          try {
            return await fetchIndexFromYahoo(yahoo, name)
          } catch {
            return mockIndex(yahoo, name)
          }
        }),
      )
      return results
        .filter((r): r is PromiseFulfilledResult<IndexQuote> => r.status === 'fulfilled')
        .map((r) => r.value)
    },
    CACHE_TTL_INDEX,
  )
}

export async function getSectorPerformance(): Promise<SectorPerformance[]> {
  return cacheGetOrSet(
    'sectors:all',
    async () => {
      const results = await Promise.allSettled(
        SECTOR_MAP.map(async ({ index, yahoo, sector }) => {
          let quote: IndexQuote
          try {
            quote = await fetchIndexFromYahoo(yahoo, index)
          } catch {
            quote = mockIndex(yahoo, index)
          }
          return {
            sector,
            index,
            value: quote.value,
            change: quote.change,
            changePercent: quote.changePercent,
            color: (quote.changePercent > 0 ? 'green' : quote.changePercent < 0 ? 'red' : 'neutral') as
              'green' | 'red' | 'neutral',
          }
        }),
      )
      return results
        .filter((r): r is PromiseFulfilledResult<SectorPerformance> => r.status === 'fulfilled')
        .map((r) => r.value)
    },
    CACHE_TTL_QUOTE,
  )
}

export async function getTopGainersLosers(): Promise<{
  gainers: MarketMover[]
  losers: MarketMover[]
}> {
  return cacheGetOrSet(
    'movers:nifty50',
    async () => {
      // Fetch all NIFTY 50 quotes (batched where possible)
      const quotes = await Promise.allSettled(
        NIFTY50.map((sym) => getStockQuote(sym, 'NSE')),
      )

      const valid = quotes
        .filter((r): r is PromiseFulfilledResult<StockQuote> => r.status === 'fulfilled')
        .map((r) => r.value)
        .map(
          (q): MarketMover => ({
            symbol: q.symbol,
            companyName: q.companyName,
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            volume: q.volume,
            marketCap: q.marketCap,
          }),
        )

      const sorted = [...valid].sort((a, b) => b.changePercent - a.changePercent)
      return {
        gainers: sorted.slice(0, 10),
        losers: sorted.slice(-10).reverse(),
      }
    },
    CACHE_TTL_MOVERS,
  )
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (!query || query.length < 2) return []

  return cacheGetOrSet(
    `search:${query.toLowerCase()}`,
    async () => {
      try {
        const yf = await getYF()
        const res = await yf.search(query)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((res.quotes ?? []) as any[])
          .filter((q: any) => q.exchange === 'NSI' || q.exchange === 'BSE' || q.typeDisp === 'Equity')
          .slice(0, 10)
          .map((q: any) => ({
            symbol: (q.symbol as string | undefined)?.replace('.NS', '').replace('.BO', '') ?? '',
            name: (q.shortname ?? q.longname ?? q.symbol ?? '') as string,
            exchange: q.exchange === 'BSE' ? 'BSE' : 'NSE',
            type: (q.typeDisp ?? 'Equity') as string,
          }))
      } catch {
        // Fallback: filter static NIFTY50 list by query string
        const q = query.toUpperCase()
        return NIFTY50.filter((sym) => sym.includes(q) || (COMPANY_NAMES[sym] ?? '').toUpperCase().includes(q))
          .slice(0, 8)
          .map((sym) => ({
            symbol: sym,
            name: COMPANY_NAMES[sym] ?? `${sym} Limited`,
            exchange: 'NSE',
            type: 'Equity',
          }))
      }
    },
    5 * 60, // 5 min TTL for search
  )
}

// ─── Market hours helper ──────────────────────────────────────────────────────

export function isMarketOpen(): boolean {
  const now = new Date()
  // Convert to IST (UTC+5:30)
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1_000)
  const day = ist.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false

  const hours = ist.getUTCHours()
  const minutes = ist.getUTCMinutes()
  const totalMin = hours * 60 + minutes

  const open = 9 * 60 + 15   // 9:15 AM
  const close = 15 * 60 + 30 // 3:30 PM
  return totalMin >= open && totalMin <= close
}
