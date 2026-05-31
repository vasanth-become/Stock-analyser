import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { detectLanguage } from '@/lib/askAria/languageDetector'
import { ARIA_CONVERSATION_SYSTEM_PROMPT } from '@/lib/askAria/ariaConversationPrompt'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FREE_DAILY_LIMIT = 20

const schema = z.object({
  message: z.string().min(1).max(500),
  conversationId: z.string().optional(),
  language: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { message, conversationId, language: preferredLang } = parsed.data

    // Rate limit for free users
    const plan = session.user.plan ?? 'FREE'
    if (plan === 'FREE') {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayCount = await prisma.aRIAMessage.count({
        where: {
          role: 'user',
          createdAt: { gte: todayStart },
          conversation: { userId },
        },
      })
      if (todayCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: `Daily limit of ${FREE_DAILY_LIMIT} messages reached. Upgrade to Research Pro for unlimited conversations.`, limitReached: true },
          { status: 429 },
        )
      }
    }

    // Detect language
    const detection = detectLanguage(message)
    const lang = preferredLang ?? detection.code

    // Get or create conversation
    let conversation = conversationId
      ? await prisma.aRIAConversation.findFirst({ where: { id: conversationId, userId } })
      : null

    if (!conversation) {
      const title = message.slice(0, 60) + (message.length > 60 ? '…' : '')
      conversation = await prisma.aRIAConversation.create({
        data: { userId, language: lang, title },
      })
    }

    // Load last 10 messages for context
    const history = await prisma.aRIAMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: -10,
    })

    // Load user profile for personalisation
    const profile = await prisma.investorProfile.findUnique({ where: { userId } })

    // Build profile context (injected as first user turn)
    const profileCtx = profile
      ? `[User context — use naturally, don't announce it: Risk tolerance: ${profile.riskTolerance}, Investment horizon: ${profile.investmentHorizon ?? 'not set'}, Experience: ${profile.experience}, Goals: ${(profile.investmentGoals ?? []).join(', ')}, Monthly income: ₹${Math.round(profile.monthlyIncome).toLocaleString('en-IN')}, SIP budget: ₹${Math.round(profile.sipBudget ?? 0).toLocaleString('en-IN')}]`
      : '[User has not completed their investor profile yet]'

    // Build Claude message array
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: profileCtx },
      { role: 'assistant', content: 'Understood. I have your profile context and will personalise my responses accordingly.' },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // Call Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: ARIA_CONVERSATION_SYSTEM_PROMPT,
      messages,
    })

    const ariaReply = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save both messages
    await prisma.aRIAMessage.createMany({
      data: [
        { conversationId: conversation.id, role: 'user', content: message, detectedLang: detection.code },
        { conversationId: conversation.id, role: 'assistant', content: ariaReply },
      ],
    })

    // Update conversation timestamp + language
    await prisma.aRIAConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date(), language: lang },
    })

    return NextResponse.json({
      reply: ariaReply,
      conversationId: conversation.id,
      detectedLanguage: { code: detection.code, name: detection.code === lang ? detection.name : undefined },
    })
  } catch (err) {
    console.error('[ask-aria] POST error:', err)
    return NextResponse.json({ error: 'ARIA is unavailable right now. Please try again.' }, { status: 500 })
  }
}
