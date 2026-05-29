import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const indices = [
  { name: 'NIFTY 50', value: '22,456.80', change: '+234.50', pct: '+1.05%', up: true },
  { name: 'SENSEX', value: '73,961.31', change: '+745.21', pct: '+1.02%', up: true },
  { name: 'NIFTY BANK', value: '48,201.05', change: '-123.45', pct: '-0.26%', up: false },
  { name: 'NIFTY IT', value: '34,567.90', change: '+456.78', pct: '+1.34%', up: true },
  { name: 'NIFTY AUTO', value: '21,890.45', change: '+312.30', pct: '+1.45%', up: true },
  { name: 'NIFTY PHARMA', value: '18,234.60', change: '-89.20', pct: '-0.49%', up: false },
  { name: 'NIFTY FMCG', value: '54,321.00', change: '+123.40', pct: '+0.23%', up: true },
  { name: 'NIFTY METAL', value: '8,901.25', change: '-234.50', pct: '-2.56%', up: false },
]

const topStocks = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: '2,834.50', change: '+1.23%', up: true, vol: '45.2L' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: '3,921.75', change: '+0.87%', up: true, vol: '12.8L' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: '1,567.20', change: '-0.34%', up: false, vol: '34.1L' },
  { symbol: 'INFY', name: 'Infosys', price: '1,789.90', change: '+1.56%', up: true, vol: '23.5L' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', price: '1,123.45', change: '+0.92%', up: true, vol: '28.7L' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: '2,456.80', change: '-0.15%', up: false, vol: '8.9L' },
]

export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Markets</h1>
        <p className="text-gray-500 text-sm mt-1">NSE & BSE market overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {indices.map((idx) => (
          <Card key={idx.name}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">{idx.name}</p>
              <p className="text-lg font-bold text-gray-900">{idx.value}</p>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${idx.up ? 'text-green-600' : 'text-red-600'}`}>
                {idx.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span>{idx.change} ({idx.pct})</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most Active Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Symbol</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">Company</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Price</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Change</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 hidden md:table-cell">Volume</th>
                </tr>
              </thead>
              <tbody>
                {topStocks.map((stock) => (
                  <tr key={stock.symbol} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <Link href={`/stock/${stock.symbol}`} className="font-semibold text-blue-600 hover:underline">
                        {stock.symbol}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">{stock.name}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">₹{stock.price}</td>
                    <td className="py-3 px-3 text-right">
                      <Badge variant={stock.up ? 'success' : 'destructive'}>{stock.change}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-500 hidden md:table-cell">{stock.vol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
