import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { detectLanguage } from '@/lib/askAria/languageDetector'
import { ARIA_CONVERSATION_SYSTEM_PROMPT } from '@/lib/askAria/ariaConversationPrompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const ONBOARDING_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ariaresearch.app'

// Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Incoming WhatsApp message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const message = change?.value?.messages?.[0]

    if (!message) return NextResponse.json({ ok: true }) // not a message event

    const from: string = message.from // WhatsApp phone number (no +)
    const text: string = message.text?.body ?? ''

    if (!text) return NextResponse.json({ ok: true })

    // Look up user by phone number (stored without + prefix)
    const user = await prisma.user.findFirst({
      where: { phone: from } as never, // phone field may not exist yet — graceful fallback
      include: { profile: true },
    }).catch(() => null)

    if (!user) {
      await sendWhatsAppMessage(from, `👋 Hi! I'm ARIA — your AI investment research assistant.\n\nYou don't have an ARIA Research account linked to this number yet.\n\nSign up free at:\n${ONBOARDING_URL}\n\nOnce you're set up, you can ask me anything about stocks, SIPs, and your portfolio — right here on WhatsApp! 🇮🇳`)
      return NextResponse.json({ ok: true })
    }

    const detection = detectLanguage(text)

    // Get or create today's WhatsApp conversation
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let conversation = await prisma.aRIAConversation.findFirst({
      where: { userId: user.id, createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
    })
    if (!conversation) {
      conversation = await prisma.aRIAConversation.create({
        data: { userId: user.id, language: detection.code, title: 'WhatsApp' },
      })
    }

    // Load recent history
    const history = await prisma.aRIAMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: -6,
    })

    const profileCtx = user.profile
      ? `[User: ${user.name}, Risk: ${user.profile.riskTolerance}, Horizon: ${user.profile.investmentHorizon}, Experience: ${user.profile.experience}]`
      : `[User: ${user.name}, profile not completed]`

    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: profileCtx },
      { role: 'assistant', content: 'Understood.' },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: text },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: ARIA_CONVERSATION_SYSTEM_PROMPT + '\n\nYou are responding via WhatsApp. Keep replies under 100 words. No markdown.',
      messages,
    })

    const ariaReply = response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not process your message right now.'

    await prisma.aRIAMessage.createMany({
      data: [
        { conversationId: conversation.id, role: 'user', content: text, detectedLang: detection.code },
        { conversationId: conversation.id, role: 'assistant', content: ariaReply },
      ],
    })

    await sendWhatsAppMessage(from, ariaReply)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp/webhook]', err)
    return NextResponse.json({ ok: true }) // Always 200 to Meta to avoid retries
  }
}

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_API_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    console.log('[whatsapp] API token not configured — skipping send to', to)
    return
  }

  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}
