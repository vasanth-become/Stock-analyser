'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Mic, MicOff, Sparkles, Plus, Trash2,
  Loader2, MessageSquare, ChevronDown, Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type SupportedLang, SUPPORTED_LANGUAGES } from '@/lib/askAria/languageDetector'
import { STARTER_PROMPTS } from '@/lib/askAria/ariaConversationPrompt'

// Re-export type to avoid direct lib import in client bundle
type Lang = SupportedLang

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  detectedLang?: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  language: string
  updatedAt: string
  preview: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const LANG_FLAG: Record<string, string> = {
  en: '🇬🇧', hi: '🇮🇳', ta: '🇮🇳', te: '🇮🇳', kn: '🇮🇳', ml: '🇮🇳',
}

// ─── Typing dots component ────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-2 mb-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn('max-w-[75%] flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm',
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  )
}

// ─── Conversation sidebar item ────────────────────────────────────────────────

function ConvItem({
  conv, active, onClick, onDelete,
}: {
  conv: Conversation
  active: boolean
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors',
        active && 'bg-blue-50 hover:bg-blue-50',
      )}
      onClick={onClick}
    >
      <MessageSquare className={cn('h-4 w-4 shrink-0 mt-0.5', active ? 'text-blue-600' : 'text-gray-400')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium truncate', active ? 'text-blue-700' : 'text-gray-700')}>
          {conv.title}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{conv.preview}</p>
        <p className="text-[10px] text-gray-300">{formatDate(conv.updatedAt)}</p>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AskAriaPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [lang, setLang] = useState<Lang>('en')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [error, setError] = useState('')
  const [limitReached, setLimitReached] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Voice input state
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Load conversations on mount
  useEffect(() => {
    fetch('/api/ask-aria/conversations')
      .then((r) => r.ok ? r.json() : [])
      .then(setConversations)
      .catch(() => {})

    setVoiceSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in (window as object))
  }, [])

  // Load a conversation
  const loadConversation = useCallback(async (id: string) => {
    setActiveConvId(id)
    setMessages([])
    setError('')
    try {
      const res = await fetch(`/api/ask-aria/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
        setLang((data.language as Lang) ?? 'en')
      }
    } catch { /* ignore */ }
  }, [])

  const startNewConversation = () => {
    setActiveConvId(null)
    setMessages([])
    setError('')
    setSidebarOpen(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const deleteConversation = async (id: string) => {
    await fetch(`/api/ask-aria/conversations/${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeConvId === id) startNewConversation()
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)
    setIsTyping(true)
    setError('')

    try {
      const res = await fetch('/api/ask-aria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId: activeConvId, language: lang }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.limitReached) setLimitReached(true)
        setError(data.error ?? 'Something went wrong')
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
        return
      }

      const ariaMsg: Message = {
        id: `aria-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, ariaMsg])

      if (data.conversationId && data.conversationId !== activeConvId) {
        setActiveConvId(data.conversationId)
        // Refresh conversations list
        fetch('/api/ask-aria/conversations')
          .then((r) => r.ok ? r.json() : [])
          .then(setConversations)
          .catch(() => {})
      }
    } catch {
      setError('Connection error. Please try again.')
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setSending(false)
      setIsTyping(false)
    }
  }, [sending, activeConvId, lang])

  // Voice input
  const startVoice = useCallback(() => {
    if (!voiceSupported) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) as new () => any
    const recognition = new SpeechRecognitionAPI()
    const selectedLang = SUPPORTED_LANGUAGES.find((l) => l.code === lang)
    recognition.lang = selectedLang?.speechLang ?? 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript))
      inputRef.current?.focus()
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [voiceSupported, lang])

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const currentStarters = STARTER_PROMPTS[lang] ?? STARTER_PROMPTS.en
  const isEmpty = messages.length === 0

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">

      {/* ── Left sidebar ── */}
      <aside className={cn(
        'flex flex-col border-r border-gray-200 bg-white transition-all duration-200',
        sidebarOpen ? 'w-64 absolute inset-y-0 left-0 z-20 shadow-lg' : 'w-0 lg:w-64',
        'overflow-hidden',
      )}>
        <div className="p-3 border-b border-gray-100">
          <Button
            onClick={startNewConversation}
            className="w-full gap-2 justify-start text-sm"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        {/* Language selector */}
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Language</p>
          <div className="grid grid-cols-2 gap-1">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  'text-left px-2 py-1.5 rounded-md text-xs transition-colors',
                  lang === l.code
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {LANG_FLAG[l.code]} {l.nativeName}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeConvId}
                onClick={() => { loadConversation(conv.id); setSidebarOpen(false) }}
                onDelete={() => deleteConversation(conv.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-10 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen((p) => !p)}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Ask ARIA</p>
              <p className="text-[10px] text-gray-500">Multilingual research assistant</p>
            </div>
          </div>
          {/* Language badge */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker((p) => !p)}
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold hover:bg-blue-100"
            >
              <Globe className="h-3.5 w-3.5" />
              {SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.nativeName ?? 'English'}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showLangPicker && (
              <div className="absolute right-0 top-8 z-30 bg-white rounded-xl border border-gray-200 shadow-lg p-2 w-48">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setShowLangPicker(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50',
                      lang === l.code && 'bg-blue-50 text-blue-700 font-semibold',
                    )}
                  >
                    {LANG_FLAG[l.code]} {l.name} <span className="text-gray-400 text-xs">({l.nativeName})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4"
          onClick={() => setShowLangPicker(false)}
        >
          {isEmpty ? (
            /* Empty state with starter prompts */
            <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Ask ARIA anything</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Type in English, Hindi, Tamil, Telugu, Kannada, or Malayalam
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {currentStarters.map((prompt: string) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
              {isTyping && (
                <div className="flex gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error / limit banner */}
        {(error || limitReached) && (
          <div className={cn(
            'mx-4 mb-2 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2',
            limitReached ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200',
          )}>
            {limitReached ? (
              <>⚠️ Daily limit of 20 messages reached. <a href="/pricing" className="underline font-semibold">Upgrade to Pro</a> for unlimited conversations.</>
            ) : (
              error
            )}
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-200">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === 'hi' ? 'ARIA से पूछें…' : lang === 'ta' ? 'ARIA-கிடம் கேளுங்கள்…' : lang === 'te' ? 'ARIA ని అడగండి…' : lang === 'kn' ? 'ARIA ಅನ್ನು ಕೇಳಿ…' : lang === 'ml' ? 'ARIA യോട് ചോദിക്കൂ…' : 'Ask ARIA anything…'}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none max-h-32 min-h-[20px]"
              rows={1}
              maxLength={500}
              disabled={limitReached}
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-gray-300 tabular-nums">{input.length}/500</span>

              {/* Voice button */}
              {voiceSupported ? (
                <button
                  onClick={listening ? stopVoice : startVoice}
                  className={cn(
                    'p-1.5 rounded-full transition-colors',
                    listening
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                  )}
                  title={listening ? 'Stop recording' : 'Voice input'}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              ) : null}

              {/* Send button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending || limitReached}
                className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            ARIA Research is not a SEBI-registered adviser · Research and education only
          </p>
        </div>
      </div>
    </div>
  )
}
