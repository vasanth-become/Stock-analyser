import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-'),
  ADMIN_EMAIL: z.string().email().optional(),
  MONTHLY_SPEND_LIMIT: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_ENV: z.string().optional(),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((e) => `  • ${e.path.join('.')}: ${e.message}`).join('\n')
    throw new Error(`Missing or invalid environment variables:\n${missing}`)
  }
  return result.data
}
