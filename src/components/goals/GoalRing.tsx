'use client'

import { cn } from '@/lib/utils'

interface GoalRingProps {
  percent: number           // 0–100
  emoji: string
  name: string
  currentCorpus: number
  targetAmount: number
  onTrack: boolean
  monthsRemaining: number
  size?: 'sm' | 'lg'
}

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function timeLabel(months: number): string {
  if (months <= 0) return 'Due'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}mo`
  if (m === 0) return `${y}yr`
  return `${y}yr ${m}mo`
}

export function GoalRing({ percent, emoji, name, currentCorpus, targetAmount, onTrack, monthsRemaining, size = 'lg' }: GoalRingProps) {
  const isLg = size === 'lg'
  const dim = isLg ? 220 : 110
  const cx = dim / 2
  const cy = dim / 2
  const r = isLg ? 90 : 44
  const sw = isLg ? 16 : 9
  const circumference = 2 * Math.PI * r
  const filled = Math.min(100, percent) / 100 * circumference
  const clampedPct = Math.min(100, percent)

  // Colour by on-track status
  const strokeColour = clampedPct >= 100 ? '#16a34a' : onTrack ? '#2563eb' : '#f59e0b'
  const bgStroke = '#e2e8f0'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={bgStroke} strokeWidth={sw} />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={strokeColour}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference - filled}`}
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rotate-0">
          <span style={{ fontSize: isLg ? 36 : 20 }}>{emoji}</span>
          {isLg && (
            <>
              <span className="text-xs text-gray-500 font-medium text-center px-2 leading-tight max-w-[120px] truncate">{name}</span>
              <span className="text-lg font-extrabold text-gray-900 leading-tight">{fmtINR(currentCorpus)}</span>
              <span className="text-[10px] text-gray-400">of {fmtINR(targetAmount)}</span>
              <span className="text-sm font-bold mt-0.5" style={{ color: strokeColour }}>{clampedPct.toFixed(1)}%</span>
            </>
          )}
          {!isLg && (
            <span className="text-[11px] font-bold text-gray-700">{clampedPct.toFixed(0)}%</span>
          )}
        </div>
      </div>

      {isLg && (
        <div className="flex items-center gap-2 text-sm">
          <span className={cn('flex items-center gap-1 font-semibold', onTrack ? 'text-green-600' : 'text-amber-600')}>
            {onTrack ? '✅ On track' : '⚠️ Behind schedule'}
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{timeLabel(monthsRemaining)} left</span>
        </div>
      )}
    </div>
  )
}
