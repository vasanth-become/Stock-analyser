export type SupportedLang = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml'

export interface DetectionResult {
  code: SupportedLang
  name: string
  confidence: 'high' | 'medium' | 'low'
}

// Unicode block ranges for Indian scripts — highly reliable
const SCRIPT_RANGES: Array<{ range: RegExp; code: SupportedLang }> = [
  { range: /[ऀ-ॿ]/, code: 'hi' }, // Devanagari → Hindi
  { range: /[஀-௿]/, code: 'ta' }, // Tamil
  { range: /[ఀ-౿]/, code: 'te' }, // Telugu
  { range: /[ಀ-೿]/, code: 'kn' }, // Kannada
  { range: /[ഀ-ൿ]/, code: 'ml' }, // Malayalam
]

// Common Romanized Hindi words (when users type Hindi in Latin script)
const HINDI_LATIN_TOKENS = new Set([
  'kya', 'hai', 'hota', 'karo', 'kaise', 'kyun', 'mera', 'meri', 'mujhe',
  'nahi', 'acha', 'theek', 'samajh', 'batao', 'bolte', 'bolna', 'matlab',
  'paisa', 'rupaye', 'khareed', 'bechna', 'bazaar', 'sahi', 'galat',
  'zyada', 'kam', 'bahut', 'thoda', 'accha', 'wala', 'wali', 'main',
  'hum', 'aap', 'tum', 'unhe', 'inhe', 'yeh', 'voh', 'iska', 'uska',
])

function countScriptChars(text: string, range: RegExp): number {
  let count = 0
  for (const ch of text) { if (range.test(ch)) count++ }
  return count
}

export function detectLanguage(text: string): DetectionResult {
  if (!text || text.trim().length === 0) {
    return { code: 'en', name: 'English', confidence: 'low' }
  }

  const cleaned = text.trim()

  // 1. Check native scripts — very reliable
  const scriptScores = SCRIPT_RANGES.map(({ range, code }) => ({
    code,
    count: countScriptChars(cleaned, range),
  })).sort((a, b) => b.count - a.count)

  const topScript = scriptScores[0]
  if (topScript.count > 0) {
    const density = topScript.count / cleaned.length
    return {
      code: topScript.code,
      name: getLanguageName(topScript.code),
      confidence: density > 0.4 ? 'high' : 'medium',
    }
  }

  // 2. Check for Romanized Hindi (Latin script)
  const tokens = cleaned.toLowerCase().split(/\s+/)
  const hindiMatches = tokens.filter((t) => HINDI_LATIN_TOKENS.has(t)).length
  if (hindiMatches >= 2 || (hindiMatches >= 1 && tokens.length <= 4)) {
    return { code: 'hi', name: 'Hindi', confidence: 'medium' }
  }

  // 3. Use franc as a fallback for longer Latin texts
  if (cleaned.length > 30) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { franc } = require('franc') as { franc: (text: string) => string }
      const franCode = franc(cleaned)
      const FRANC_MAP: Record<string, SupportedLang> = {
        hin: 'hi', bho: 'hi', mai: 'hi', // Bhojpuri/Maithili often misclassified Devanagari
        tam: 'ta', tel: 'te', kan: 'kn', mal: 'ml',
        eng: 'en',
      }
      const mapped = FRANC_MAP[franCode]
      if (mapped) {
        return { code: mapped, name: getLanguageName(mapped), confidence: 'medium' }
      }
    } catch {
      // franc unavailable, fall through
    }
  }

  return { code: 'en', name: 'English', confidence: 'low' }
}

export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
  }
  return names[code] ?? 'English'
}

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLang; name: string; nativeName: string; speechLang: string }> = [
  { code: 'en', name: 'English',    nativeName: 'English',    speechLang: 'en-IN' },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',       speechLang: 'hi-IN' },
  { code: 'ta', name: 'Tamil',      nativeName: 'தமிழ்',        speechLang: 'ta-IN' },
  { code: 'te', name: 'Telugu',     nativeName: 'తెలుగు',       speechLang: 'te-IN' },
  { code: 'kn', name: 'Kannada',    nativeName: 'ಕನ್ನಡ',        speechLang: 'kn-IN' },
  { code: 'ml', name: 'Malayalam',  nativeName: 'മലയാളം',      speechLang: 'ml-IN' },
]
