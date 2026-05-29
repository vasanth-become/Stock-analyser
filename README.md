# StockAnalyser

AI-powered Indian equity research and portfolio management platform. Built with Next.js 14, Claude AI (Sonnet), and Razorpay.

> ⚠️ **Not financial advice.** See [DISCLAIMER.md](./DISCLAIMER.md) for full legal disclosure.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Module Overview](#module-overview)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
  - [Vercel (recommended)](#vercel-recommended)
  - [Render.com](#rendercom)
  - [Docker](#docker)
- [Running Tests](#running-tests)
- [Monitoring](#monitoring)

---

## Features

| Tier | Features |
|------|----------|
| **Free** | 3 AI analyses/day · Watchlist (10 stocks) · Basic portfolio tracker · Market data |
| **Pro (₹299/mo or ₹2,499/yr)** | Unlimited AI analyses · Unlimited watchlist · Price alerts (20) · Weekly digest email · Portfolio XIRR · Priority AI model |
| **Admin** | Full access · Usage dashboard · User management · Broadcast emails · API spend tracking |

---

## Architecture

```
 Browser / Mobile
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js 14  (App Router)                      │
│                                                                  │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │  Pages/UI   │   │  28 API Routes   │   │  Background Jobs │  │
│  │  (RSC +     │   │  /api/*          │   │  node-cron /     │  │
│  │   Client)   │   │                  │   │  Vercel Cron     │  │
│  └─────────────┘   └────────┬─────────┘   └──────────────────┘  │
│                             │                                    │
│              ┌──────────────┼─────────────────┐                 │
│              │              │                 │                 │
│   ┌──────────▼──┐  ┌────────▼──────┐  ┌──────▼──────────────┐  │
│   │  Upstash    │  │  PostgreSQL   │  │  External APIs      │  │
│   │  Redis      │  │  (Prisma ORM) │  │  • Claude (Sonnet)  │  │
│   │  Rate limit │  │               │  │  • Yahoo Finance    │  │
│   └─────────────┘  └───────────────┘  │  • Razorpay         │  │
│                                       │  • Resend           │  │
│                                       └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

Monitoring: Sentry (errors + traces) · /api/health (uptime ping)
```

### Request lifecycle

```
Browser Request
  → Edge Middleware  (NextAuth session + Upstash rate limit)
  → API Route        (role/plan gate → business logic → Prisma)
  → Response         (+ X-RateLimit-* headers)
  → Sentry           (captures any unhandled errors)
```

---

## Module Overview

| # | Module | Description | Key files |
|---|--------|-------------|-----------|
| 1 | **Auth** | NextAuth v5 — Google OAuth + email/password, JWT sessions, role/plan in token | `src/lib/auth.ts` |
| 2 | **Onboarding** | Risk assessment wizard, investor profile creation (age, income, goals) | `src/app/onboarding/` |
| 3 | **Market Data** | Yahoo Finance — indices, sectors, movers, stock fundamentals, in-memory cache | `src/lib/marketData.ts` |
| 4 | **ARIA Analysis** | Claude AI portfolio analysis engine; ARIA system prompt; structured JSON output via Zod | `src/lib/analysisEngine.ts` |
| 5 | **Portfolio** | Holdings tracker, buy price vs. current price P&L, XIRR calculator | `src/app/(dashboard)/portfolio/` |
| 6 | **Price Alerts** | Cron-checked threshold alerts (PRICE_ABOVE, PRICE_BELOW, PERCENT_CHANGE), Resend notifications | `src/lib/alertChecker.ts` |
| 7 | **PRIYA SIP** | Claude AI mutual fund recommendation engine; PRIYA system prompt; step-up SIP projections | `src/lib/sipEngine.ts` |
| 8 | **MERCURY Digest** | Weekly AI market briefing email (Monday 08:00 IST); MERCURY system prompt | `src/lib/digestEngine.ts` |
| 9 | **Subscriptions** | Razorpay Free/Pro billing, subscription webhook lifecycle, feature gating via PLAN_LIMITS | `src/lib/subscription.ts`, `src/lib/razorpay.ts` |
| 10 | **Admin** | Metrics dashboard (DAU/MAU, MRR, API spend), user management, broadcast emails | `src/app/admin/`, `src/lib/adminStats.ts` |

**Production layer** (this module):

| Component | Purpose |
|-----------|---------|
| `src/lib/rateLimit.ts` | Upstash sliding-window rate limiter (4 tiers: default/auth/ai/strict) |
| `src/lib/spendGuard.ts` | Monthly Claude API spend cap with Resend warning email at 80% |
| `src/lib/validateEnv.ts` | Zod env validation — throws on startup if required vars are missing |
| `sentry.*.config.ts` | Sentry error tracking for client, server, and Edge runtimes |
| `Dockerfile` | Multi-stage build → standalone Next.js image (~200 MB) |
| `docker-compose.yml` | App + PostgreSQL 16 + Redis 7 + optional Prisma Studio |
| `vercel.json` | Vercel region, cron schedules, function memory/timeout |
| `render.yaml` | Render.com infrastructure-as-code (web service + managed Postgres) |

---

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- Anthropic API key (`sk-ant-…`) from [console.anthropic.com](https://console.anthropic.com)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/vasanth-become/stock-analyser.git
cd stock-analyser

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Open .env.local and set at minimum:
#   DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed the admin account  (requires ADMIN_EMAIL in .env.local)
npm run seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker (full stack in one command)

```bash
cp .env.example .env.local     # fill in your API keys
docker compose up --build      # starts app + postgres + redis
```

Browse your database with Prisma Studio:
```bash
docker compose --profile tools up prisma-studio
# http://localhost:5555
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random 32-byte string — `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Claude API key (must start with `sk-`) |

### Auth

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Full app URL, no trailing slash |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### App

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public base URL |
| `NEXT_PUBLIC_ENV` | `development` | Set to `production` on deploy |
| `ADMIN_EMAIL` | — | Receives spend warnings; seeded as admin |
| `MONTHLY_SPEND_LIMIT` | `50` | USD cap on Claude spend before 503s |
| `CRON_SECRET` | — | Bearer token for `/api/cron/*` endpoints |

### Payments (optional)

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay publishable key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC-SHA256 secret |
| `RAZORPAY_PLAN_MONTHLY` | Razorpay plan ID for ₹299/month |
| `RAZORPAY_PLAN_YEARLY` | Razorpay plan ID for ₹2,499/year |

### Email (optional)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | From address, e.g. `StockAnalyser <alerts@yourdomain.com>` |

### Rate Limiting (optional — disabled if not set)

| Variable | Description |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

Rate limits (sliding window per IP):
- `/api/auth/*` — 10 req/min
- `/api/analyse`, `/api/sip/*` — 20 req/min
- `/api/admin/*`, `/api/webhooks/*` — 5 req/min
- All other `/api/*` — 100 req/min

### Sentry (optional — disabled if not set)

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Server-side DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side DSN (safe to expose) |
| `SENTRY_ORG` | Org slug (source map upload only) |
| `SENTRY_PROJECT` | Project slug |
| `SENTRY_AUTH_TOKEN` | Auth token (CI/CD source map upload) |

---

## Deployment

### Vercel (recommended)

1. Push to GitHub and import at [vercel.com/new](https://vercel.com/new)
2. Set environment variables in the Vercel dashboard
3. The included `vercel.json` configures:
   - **Region**: `sin1` (Singapore — lowest latency from India)
   - **Cron jobs**: market refresh every 15 min (market hours), weekly digest, monthly reset
   - **Function config**: 60s / 1 GB RAM for AI routes; 300s for broadcast

Recommended managed services with Vercel:
- **Database**: [Neon](https://neon.tech) — serverless Postgres, free tier
- **Rate limiting**: [Upstash](https://upstash.com) — serverless Redis, 10k req/day free

```bash
npm i -g vercel && vercel --prod
```

### Render.com

`render.yaml` defines the full infrastructure:

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo — Render creates the web service + Postgres automatically
3. Set the `sync: false` env vars manually in the dashboard

### Docker

```bash
# Build the production image
docker build -t stockanalyser .

# Run with env file
docker run -p 3000:3000 --env-file .env.local stockanalyser

# Full stack (app + postgres + redis)
docker compose up --build
```

The image uses Next.js [standalone output](https://nextjs.org/docs/app/api-reference/next-config-js/output) — self-contained, no separate `node_modules` needed at runtime.

---

## Running Tests

```bash
npm test                      # run all tests
npm test -- --watch           # watch mode
npm test -- --coverage        # with coverage report
```

| Test file | Coverage |
|-----------|----------|
| `analysisEngine.test.ts` | ARIA prompt structure, Zod schema validation — 60 tests |
| `sipEngine.test.ts` | PRIYA engine, SIP step-up calculator — 65 tests |
| `digestEngine.test.ts` | MERCURY digest engine — 52 tests |
| `subscription.test.ts` | Billing logic, HMAC-SHA256 signatures — 55 tests |
| `cron.test.ts` | Cron job scheduling — 7 tests |
| `anthropic.test.ts` | Claude API client — 7 tests |

---

## Monitoring

| Signal | Tool | Endpoint / Config |
|--------|------|-------------------|
| Uptime | Any HTTP monitor | `GET /api/health` — returns `200 ok` or `503 degraded` |
| Errors | Sentry | Auto-captures via `sentry.*.config.ts` + `instrumentation.ts` |
| API spend | Admin dashboard | `/admin` → API Usage & Spend section |
| Rate limits | Upstash analytics | Upstash console (when configured) |

Configure your uptime monitor (Better Uptime, Checkly, UptimeRobot) to poll `/api/health` every 60 seconds and alert on non-200 status.

---

## License

MIT

---

## Disclaimer

StockAnalyser is **not** a SEBI-registered Investment Adviser. All AI-generated content is for informational purposes only and does not constitute investment advice. See [DISCLAIMER.md](./DISCLAIMER.md).
