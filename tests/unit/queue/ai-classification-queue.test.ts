import { describe, it, expect, vi } from 'vitest'
import type { RawImportRow } from '@/types/import'

// Mock OpenRouter before importing the queue
vi.mock('@server/ai/providers/openrouter', () => ({
  openRouter: {
    chat: {
      send: vi.fn(),
    },
  },
}))

import { classifyWithAI } from '@server/queue/ai-classification-queue'
import { openRouter } from '@server/ai/providers/openrouter'

const mockOpenRouter = openRouter as { chat: { send: ReturnType<typeof vi.fn> } }

const makeRow = (narration: string): RawImportRow => ({
  raw_data: {},
  amount: 100,
  datetime: '2026-02-15T00:00:00',
  type: 'EXPENSE',
  narration,
})

describe('classifyWithAI', () => {
  it('returns AI-classified rows in order', async () => {
    mockOpenRouter.chat.send.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { category: 'Food', platform: 'Zomato', payment_method: 'UPI', tags: [], type: 'EXPENSE' },
            { category: 'Transport', platform: 'Uber', payment_method: 'UPI', tags: [], type: 'EXPENSE' },
          ])
        }
      }]
    })

    const rows = [makeRow('some food thing'), makeRow('some cab thing')]
    const results = await classifyWithAI(rows)
    expect(results).toHaveLength(2)
    expect(results[0].category).toBe('Food')
    expect(results[0].classified_by).toBe('AI')
    expect(results[1].category).toBe('Transport')
  })

  it('throws on AI API failure so the caller can handle it and mark the session FAILED', async () => {
    mockOpenRouter.chat.send.mockRejectedValue(new Error('API error'))
    const rows = [makeRow('unknown thing')]
    await expect(classifyWithAI(rows)).rejects.toThrow('API error')
  })
})
