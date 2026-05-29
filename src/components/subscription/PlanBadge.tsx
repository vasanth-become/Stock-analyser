'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlanBadgeProps {
  plan: string
  className?: string
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE'

  if (!isPro) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600',
          className,
        )}
      >
        Free
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-violet-100 text-blue-700',
        className,
      )}
    >
      <Zap className="h-3 w-3 fill-blue-600" />
      Pro
    </span>
  )
}
