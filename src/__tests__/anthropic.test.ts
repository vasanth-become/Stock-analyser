/**
 * Tests for anthropic.ts — analyzeStock wrapper around the Anthropic SDK.
 *
 * The Anthropic SDK is mocked; tests verify prompt forwarding and response handling.
 */

// Mock the Anthropic SDK before importing the module under test
const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

import { analyzeStock } from '@/lib/anthropic'

describe('analyzeStock', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  it('returns the text content from the Anthropic response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Strong buy — RELIANCE looks attractive at current levels.' }],
    })

    const result = await analyzeStock('Analyse RELIANCE')
    expect(result).toBe('Strong buy — RELIANCE looks attractive at current levels.')
  })

  it('passes the prompt as the user message content', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    })

    const prompt = 'Analyse TCS with fundamentals'
    await analyzeStock(prompt)

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: prompt }),
      ])
    )
  })

  it('uses the correct model', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    })

    await analyzeStock('test prompt')

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-sonnet-4-6')
  })

  it('sets a system prompt containing Indian market context', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    })

    await analyzeStock('test')

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.system).toContain('NSE')
    expect(callArgs.system).toContain('BSE')
  })

  it('throws when the response content type is not text', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'tu_1', name: 'some_tool', input: {} }],
    })

    await expect(analyzeStock('test')).rejects.toThrow('Unexpected response type')
  })

  it('propagates SDK errors without swallowing them', async () => {
    mockCreate.mockRejectedValue(new Error('rate limit exceeded'))

    await expect(analyzeStock('test')).rejects.toThrow('rate limit exceeded')
  })

  it('calls messages.create with max_tokens set', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    })

    await analyzeStock('test')

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.max_tokens).toBeGreaterThan(0)
  })
})
