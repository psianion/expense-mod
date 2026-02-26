import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock OpenRouter before importing the module under test
vi.mock('@server/ai/providers/openrouter', () => ({
  openRouter: {
    chat: {
      send: vi.fn(),
    },
  },
}))

import { extractRowsFromText } from '@server/import/ai-row-extractor'
import { openRouter } from '@server/ai/providers/openrouter'

const mockOpenRouter = vi.mocked(openRouter)

beforeEach(() => {
  vi.mocked(mockOpenRouter.chat.send).mockReset()
})

describe('extractRowsFromText', () => {
  it('parses AI JSON response into RawImportRow array', async () => {
    mockOpenRouter.chat.send.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify([
            { date: '2026-01-15', amount: 450, type: 'EXPENSE', narration: 'Zomato Order' },
            { date: '2026-01-01', amount: 75000, type: 'INFLOW', narration: 'Salary Credit' },
          ]),
        },
      }],
    } as never)

    const rows = await extractRowsFromText('...bank statement text...')
    expect(rows).toHaveLength(2)
    expect(rows[0].amount).toBe(450)
    expect(rows[0].type).toBe('EXPENSE')
    expect(rows[0].datetime).toBe('2026-01-15T00:00:00')
    expect(rows[0].narration).toBe('Zomato Order')
    expect(rows[1].amount).toBe(75000)
    expect(rows[1].type).toBe('INFLOW')
  })

  it('returns empty array when AI returns empty JSON array', async () => {
    mockOpenRouter.chat.send.mockResolvedValueOnce({
      choices: [{ message: { content: '[]' } }],
    } as never)
    const rows = await extractRowsFromText('empty statement')
    expect(rows).toHaveLength(0)
  })

  it('throws when AI returns invalid JSON', async () => {
    mockOpenRouter.chat.send.mockResolvedValueOnce({
      choices: [{ message: { content: 'not json at all' } }],
    } as never)
    await expect(extractRowsFromText('text')).rejects.toThrow()
  })

  it('skips rows missing amount or date', async () => {
    mockOpenRouter.chat.send.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify([
            { date: '2026-01-15', amount: 450, type: 'EXPENSE', narration: 'Valid' },
            { date: null, amount: 100, type: 'EXPENSE', narration: 'No date — skip' },
            { date: '2026-01-16', amount: null, type: 'EXPENSE', narration: 'No amount — skip' },
          ]),
        },
      }],
    } as never)
    const rows = await extractRowsFromText('text')
    expect(rows).toHaveLength(1)
    expect(rows[0].narration).toBe('Valid')
  })
})
