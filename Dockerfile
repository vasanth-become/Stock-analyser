# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Install dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDeps needed for build)
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build the application
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for Linux/Alpine
RUN npx prisma generate

# Build Next.js (standalone output enabled in next.config.mjs)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Production runner (minimal image)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy the standalone Next.js server bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# Copy Prisma schema + generated client (needed at runtime for migrations and queries)
COPY --from=builder --chown=nextjs:nodejs /app/prisma                 ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma   ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma   ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run database migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null || true && node server.js"]
