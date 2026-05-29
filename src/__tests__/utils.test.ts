import { cn, formatCurrency, formatNumber, formatPercent, getChangeColor, getChangeBg } from '@/lib/utils'

describe('cn (class merger)', () => {
  it('merges plain strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves Tailwind conflicts (last wins)', () => {
    // twMerge: text-red-500 overrides text-blue-500
    const result = cn('text-blue-500', 'text-red-500')
    expect(result).toBe('text-red-500')
    expect(result).not.toContain('text-blue-500')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('handles conditional objects', () => {
    const active = true
    const result = cn('base', { active: active, inactive: !active })
    expect(result).toContain('base')
    expect(result).toContain('active')
    expect(result).not.toContain('inactive')
  })

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats INR with 2 decimal places', () => {
    const result = formatCurrency(1234.5)
    expect(result).toContain('1,234.50')
  })

  it('includes currency symbol', () => {
    const result = formatCurrency(1000)
    // en-IN locale uses ₹
    expect(result).toContain('₹')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toContain('0.00')
  })

  it('handles negative amounts', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500.00')
  })
})

describe('formatNumber', () => {
  it('formats crores', () => {
    expect(formatNumber(1_00_00_000)).toContain('Cr')
  })

  it('formats lakhs', () => {
    expect(formatNumber(5_00_000)).toContain('L')
  })

  it('formats thousands', () => {
    expect(formatNumber(5000)).toContain('K')
  })

  it('formats small numbers as-is', () => {
    const result = formatNumber(42.5)
    expect(result).toBe('42.50')
  })
})

describe('formatPercent', () => {
  it('prefixes positive values with +', () => {
    expect(formatPercent(2.5)).toBe('+2.50%')
  })

  it('keeps negative sign for negative values', () => {
    expect(formatPercent(-1.23)).toBe('-1.23%')
  })

  it('shows + for zero', () => {
    expect(formatPercent(0)).toBe('+0.00%')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatPercent(3.14159)).toBe('+3.14%')
  })
})

describe('getChangeColor', () => {
  it('returns green class for positive values', () => {
    expect(getChangeColor(1)).toBe('text-green-500')
  })

  it('returns red class for negative values', () => {
    expect(getChangeColor(-1)).toBe('text-red-500')
  })

  it('returns gray class for zero', () => {
    expect(getChangeColor(0)).toBe('text-gray-500')
  })
})

describe('getChangeBg', () => {
  it('returns green bg for positive values', () => {
    const result = getChangeBg(5)
    expect(result).toContain('green')
  })

  it('returns red bg for negative values', () => {
    const result = getChangeBg(-5)
    expect(result).toContain('red')
  })

  it('returns gray bg for zero', () => {
    const result = getChangeBg(0)
    expect(result).toContain('gray')
  })
})
