import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeStock(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    system: `You are an expert Indian stock market analyst with deep knowledge of NSE and BSE listed companies.
You provide insightful, data-driven analysis for retail investors.
Always structure your responses clearly with sections for Summary, Key Metrics, Risks, and Recommendation.
Use Indian financial terminology and context (INR, BSE/NSE, SEBI regulations, etc.).
Keep analysis concise, actionable, and suitable for retail investors.`,
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}
