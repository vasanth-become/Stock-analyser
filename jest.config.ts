import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // Allow Jest to use CommonJS-compatible settings
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        jsx: 'react',
      },
    }],
  },
  // Prevent the Next.js module from being evaluated in tests
  modulePathIgnorePatterns: ['<rootDir>/.next'],
  // Auto-clear mocks between tests
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/**/*.ts',
    '!src/lib/prisma.ts',
    '!src/lib/auth.ts',
    '!src/lib/cron.ts',
    '!src/lib/anthropic.ts',
  ],
}

export default config
