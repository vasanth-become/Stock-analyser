'use client'

import { useState } from 'react'
import { Sparkles, Loader2, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const sampleStocks = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'TATAMOTORS', 'BAJFINANCE']

export default function AnalysisPage() {
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE')
  const [analysisType, setAnalysisType] = useState<'technical' | 'fundamental' | 'ai_summary'>('ai_summary')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function handleAnalyse() {
    if (!symbol.trim()) return
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), exchange, type: analysisType }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data.analysis)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          AI Stock Analysis
        </h1>
        <p className="text-gray-500 mt-1">Get Claude AI-powered insights for any NSE/BSE stock</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyse a Stock</CardTitle>
          <CardDescription>Enter a stock symbol to get personalised AI analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="e.g. RELIANCE, TCS, INFY"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyse()}
                className="uppercase"
              />
            </div>
            <div className="flex gap-2">
              {(['NSE', 'BSE'] as const).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExchange(ex)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    exchange === ex
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'ai_summary', label: '🤖 AI Summary' },
              { value: 'technical', label: '📈 Technical' },
              { value: 'fundamental', label: '📊 Fundamental' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAnalysisType(value as 'technical' | 'fundamental' | 'ai_summary')}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  analysisType === value
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button onClick={handleAnalyse} disabled={loading || !symbol.trim()} className="w-full sm:w-auto">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate Analysis</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sample stocks */}
      <div>
        <p className="text-sm text-gray-500 mb-3">Popular stocks:</p>
        <div className="flex flex-wrap gap-2">
          {sampleStocks.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                {symbol} Analysis
              </CardTitle>
              <div className="flex gap-2">
                <Badge>{exchange}</Badge>
                <Badge variant="secondary">{analysisType.replace('_', ' ').toUpperCase()}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{result}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
