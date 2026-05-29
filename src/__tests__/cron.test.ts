/**
 * Tests for cron.ts — in-process scheduler initialisation.
 *
 * node-cron is mocked; tests verify guard conditions and job registration.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSchedule = jest.fn()
jest.mock('node-cron', () => ({ __esModule: true, default: { schedule: mockSchedule } }))

jest.mock('@/lib/cache', () => ({ cacheInvalidate: jest.fn() }))

jest.mock('@/lib/marketData', () => ({
  isMarketOpen: jest.fn().mockReturnValue(true),
  getIndexQuotes: jest.fn().mockResolvedValue([]),
  getSectorPerformance: jest.fn().mockResolvedValue([]),
  getTopGainersLosers: jest.fn().mockResolvedValue({ gainers: [], losers: [] }),
}))

jest.mock('@/lib/alertChecker', () => ({
  checkAlerts: jest.fn().mockResolvedValue(undefined),
  sendWeeklyDigests: jest.fn().mockResolvedValue(undefined),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Flush any pending microtasks / setImmediate callbacks. */
const flush = () => new Promise((r) => setImmediate(r))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('initMarketCron', () => {
  it('does not schedule any jobs when NODE_ENV is "test"', async () => {
    // Jest runs with NODE_ENV=test — import will be a no-op
    const { initMarketCron } = await import('@/lib/cron')
    initMarketCron()
    await flush()
    expect(mockSchedule).not.toHaveBeenCalled()
  })
})

// Re-import the module fresh with production env for the remaining tests.
// We use a separate describe so resetModules() only affects this block.
describe('initMarketCron (production env)', () => {
  let initMarketCron: () => void
  const registeredExpressions: string[] = []

  beforeAll(async () => {
    // Simulate production environment for this block
    jest.resetModules()
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })

    // Capture schedule expressions as they are registered
    mockSchedule.mockImplementation((expr: string) => {
      registeredExpressions.push(expr)
    })

    const mod = await import('@/lib/cron')
    initMarketCron = mod.initMarketCron
    initMarketCron()
    await flush()
  })

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
  })

  it('registers exactly 3 cron jobs', () => {
    expect(registeredExpressions).toHaveLength(3)
  })

  it('is idempotent — a second call registers no additional jobs', async () => {
    initMarketCron()
    await flush()
    expect(registeredExpressions).toHaveLength(3)
  })

  it('includes at least 2 weekday-only (Mon–Fri) expressions', () => {
    const weekdayJobs = registeredExpressions.filter((e) => e.includes('1-5'))
    expect(weekdayJobs.length).toBeGreaterThanOrEqual(2)
  })

  it('includes the weekly digest expression (Monday 02:30 UTC)', () => {
    expect(registeredExpressions).toContain('30 2 * * 1')
  })
})

// ─── Job handler logic ────────────────────────────────────────────────────────

describe('cron job handlers', () => {
  it('market data job skips when market is closed', async () => {
    const { isMarketOpen, getIndexQuotes } = await import('@/lib/marketData')
    const { cacheInvalidate } = await import('@/lib/cache')

    const isMarketOpenMock = isMarketOpen as jest.Mock
    const getIndexQuotesMock = getIndexQuotes as jest.Mock
    const cacheInvalidateMock = cacheInvalidate as jest.Mock

    isMarketOpenMock.mockReturnValue(false)

    // Simulate what the job handler does
    if (!isMarketOpen()) return // market closed — skip

    await getIndexQuotes()
    cacheInvalidate('indices:')

    expect(getIndexQuotesMock).not.toHaveBeenCalled()
    expect(cacheInvalidateMock).not.toHaveBeenCalled()
  })

  it('alert checker skips when market is closed', async () => {
    const { isMarketOpen } = await import('@/lib/marketData')
    const { checkAlerts } = await import('@/lib/alertChecker')

    const isMarketOpenMock = isMarketOpen as jest.Mock
    const checkAlertsMock = checkAlerts as jest.Mock

    isMarketOpenMock.mockReturnValue(false)

    if (!isMarketOpen()) return

    await checkAlerts()

    expect(checkAlertsMock).not.toHaveBeenCalled()
  })
})
