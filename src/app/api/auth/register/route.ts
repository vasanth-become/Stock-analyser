import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    })

    return NextResponse.json({ message: 'Account created successfully' }, { status: 201 })
  } catch (error) {
    console.error('[register]', error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('connect') || msg.includes('ECONNREFUSED') || msg.includes("Can't reach database")) {
      return NextResponse.json({ error: 'Database not reachable. Check DATABASE_URL in .env.local.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error', detail: process.env.NODE_ENV === 'development' ? msg : undefined }, { status: 500 })
  }
}
