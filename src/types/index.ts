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
  marketCap?: number
  pe?: number
  eps?: number
  week52High?: number
  week52Low?: number
  timestamp: string
}

export interface ChartData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface PortfolioSummary {
  totalValue: number
  totalInvested: number
  totalGain: number
  totalGainPercent: number
  dayGain: number
  dayGainPercent: number
  holdings: HoldingSummary[]
}

export interface HoldingSummary {
  symbol: string
  exchange: 'NSE' | 'BSE'
  companyName: string
  quantity: number
  avgPrice: number
  currentPrice: number
  currentValue: number
  invested: number
  gain: number
  gainPercent: number
  dayChange: number
  dayChangePercent: number
}

export interface MarketIndex {
  name: string
  value: number
  change: number
  changePercent: number
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  relatedSymbols?: string[]
}

export interface TechnicalIndicator {
  name: string
  value: number
  signal: 'buy' | 'sell' | 'neutral'
}

export interface FundamentalData {
  pe: number
  pb: number
  eps: number
  dividendYield: number
  roe: number
  roce: number
  debtToEquity: number
  revenueGrowth: number
  profitGrowth: number
  marketCap: number
  bookValue: number
}
