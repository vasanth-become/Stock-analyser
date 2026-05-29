'use client'

import { cn } from '@/lib/utils'

interface GaugeProps {
  value: number    // 0–100
  size?: number    // svg width/height
  className?: string
}

const SEGMENTS = [
  { label: 'Conservative', color: '#3b82f6', range: [0, 33] },
  { label: 'Moderate',     color: '#10b981', range: [33, 66] },
  { label: 'Aggressive',   color: '#f59e0b', range: [66, 100] },
]

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg)
  const e = polarToCartesian(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

export function RiskGauge({ value, size = 200, className }: GaugeProps) {
  const cx = size / 2
  const cy = size / 2 + 10
  const r = size * 0.38
  const strokeW = size * 0.09

  // Gauge spans from -150° to +150° (300° total sweep, centered at 0 = top)
  const START_DEG = -150
  const END_DEG = 150
  const SWEEP = END_DEG - START_DEG // 300

  const clampedValue = Math.max(0, Math.min(100, value))
  const needleDeg = START_DEG + (clampedValue / 100) * SWEEP

  // Needle tip & base
  const needleLen = r - strokeW / 2
  const tip = polarToCartesian(cx, cy, needleLen, needleDeg)
  const leftBase = polarToCartesian(cx, cy, strokeW * 0.35, needleDeg - 90)
  const rightBase = polarToCartesian(cx, cy, strokeW * 0.35, needleDeg + 90)

  // Current segment colour for needle
  const activeSegment = SEGMENTS.find(
    (s) => clampedValue >= s.range[0] && clampedValue <= s.range[1]
  ) ?? SEGMENTS[1]

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`}>
        {/* Background track */}
        <path
          d={describeArc(cx, cy, r, START_DEG, END_DEG)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Coloured segments */}
        {SEGMENTS.map((seg) => {
          const segStart = START_DEG + (seg.range[0] / 100) * SWEEP
          const segEnd = START_DEG + (seg.range[1] / 100) * SWEEP
          return (
            <path
              key={seg.label}
              d={describeArc(cx, cy, r, segStart, segEnd)}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeW}
              strokeLinecap="butt"
              opacity={0.25}
            />
          )
        })}

        {/* Filled progress arc */}
        {clampedValue > 0 && (
          <path
            d={describeArc(cx, cy, r, START_DEG, needleDeg)}
            fill="none"
            stroke={activeSegment.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        <polygon
          points={`${tip.x},${tip.y} ${leftBase.x},${leftBase.y} ${rightBase.x},${rightBase.y}`}
          fill={activeSegment.color}
          opacity={0.9}
        />

        {/* Centre hub */}
        <circle cx={cx} cy={cy} r={strokeW * 0.45} fill={activeSegment.color} />
        <circle cx={cx} cy={cy} r={strokeW * 0.22} fill="white" />

        {/* Segment labels */}
        {SEGMENTS.map((seg) => {
          const midDeg = START_DEG + ((seg.range[0] + seg.range[1]) / 2 / 100) * SWEEP
          const labelR = r + strokeW * 1.1
          const pos = polarToCartesian(cx, cy, labelR, midDeg)
          return (
            <text
              key={seg.label}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.057}
              fill={seg.color}
              fontWeight="600"
            >
              {seg.label}
            </text>
          )
        })}

        {/* Value text */}
        <text
          x={cx}
          y={cy - strokeW * 0.05}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.11}
          fill="#111827"
          fontWeight="700"
        >
          {clampedValue}
        </text>
        <text
          x={cx}
          y={cy + strokeW * 0.85}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.065}
          fill="#6b7280"
        >
          Risk Score
        </text>
      </svg>

      {/* Active label badge */}
      <div
        className="mt-1 rounded-full px-4 py-1 text-sm font-semibold text-white"
        style={{ backgroundColor: activeSegment.color }}
      >
        {activeSegment.label}
      </div>
    </div>
  )
}
