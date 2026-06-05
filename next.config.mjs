import { withSentryConfig } from '@sentry/nextjs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output creates a self-contained server bundle — required for Docker
  output: 'standalone',

  // Skip ESLint during production build — pre-existing lint issues in the codebase
  eslint: { ignoreDuringBuilds: true },

  // Skip TypeScript errors during build — tsc runs separately in CI
  typescript: { ignoreBuildErrors: true },

  // Enable server instrumentation (cron init + Sentry + env validation)
  experimental: {
    instrumentationHook: true,
    // Keep these server-only packages out of the client/edge bundle
    serverComponentsExternalPackages: ['@react-pdf/renderer', '@anthropic-ai/sdk'],
  },

  images: {
    domains: ['avatars.githubusercontent.com'],
  },

  webpack(config, { isServer }) {
    config.ignoreWarnings = [{ module: /node_modules\/punycode/ }]

    // Webpack treats '.prisma/client/default' as a relative path (starts with '.'),
    // but Node.js treats it as a package name and finds node_modules/.prisma/client/default.
    // This alias tells webpack where to find it.
    config.resolve.alias = {
      ...config.resolve.alias,
      '.prisma/client/default': require.resolve('.prisma/client/default'),
    }

    // @react-pdf/renderer (and canvas) use Node.js built-ins — exclude from browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        child_process: false,
        canvas: false,
      }
    }

    return config
  },

  async redirects() {
    return [
      // Old standalone pages → new consolidated sections
      { source: '/watchlist',     destination: '/dashboard/investments?tab=watchlist',       permanent: false },
      { source: '/portfolio',     destination: '/dashboard/investments?tab=portfolio',        permanent: false },
      { source: '/thesis',        destination: '/dashboard/investments?tab=research-notes',   permanent: false },
      { source: '/thesis/:path*', destination: '/dashboard/investments?tab=research-notes',   permanent: false },
      { source: '/goals',         destination: '/dashboard/plan?tab=goals',                   permanent: false },
      { source: '/goals/:path*',  destination: '/dashboard/plan?tab=goals',                   permanent: false },
      { source: '/sip-planner',   destination: '/dashboard/plan?tab=sip',                     permanent: false },
      { source: '/reports',       destination: '/dashboard/plan?tab=reports',                  permanent: false },
      { source: '/reports/:path*',destination: '/dashboard/plan?tab=reports',                  permanent: false },
      { source: '/behaviour',     destination: '/dashboard/alerts',                            permanent: false },
      { source: '/alerts',        destination: '/dashboard/alerts',                            permanent: false },
      { source: '/ask-aria',      destination: '/dashboard/aria',                              permanent: false },
      { source: '/search',        destination: '/dashboard/aria',                              permanent: false },
      { source: '/analysis',      destination: '/dashboard',                                   permanent: false },
      { source: '/recommendations', destination: '/dashboard',                                 permanent: false },
      { source: '/markets',       destination: '/dashboard',                                   permanent: false },
    ]
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Allow Razorpay checkout iframe on payment pages
        source: '/pricing',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
