import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BatchQueue } from '@server/queue/batch-queue'

describe('BatchQueue', () => {
  it('processes all items and returns results in order', async () => {
    const handler = vi.fn(async (batch: number[]) => batch.map(n => n * 2))
    const queue = new BatchQueue({ batchSize: 3, concurrency: 1, retries: 0, backoffMs: 0, timeoutMs: 5000, handler })
    const result = await queue.enqueue([1, 2, 3, 4, 5])
    expect(result).toEqual([2, 4, 6, 8, 10])
  })

  it('chunks items into correct batch sizes', async () => {
    const handler = vi.fn(async (batch: number[]) => batch.map(n => n))
    const queue = new BatchQueue({ batchSize: 2, concurrency: 1, retries: 0, backoffMs: 0, timeoutMs: 5000, handler })
    await queue.enqueue([1, 2, 3, 4, 5])
    expect(handler).toHaveBeenCalledTimes(3) // [1,2], [3,4], [5]
    expect(handler).toHaveBeenNthCalledWith(1, [1, 2])
    expect(handler).toHaveBeenNthCalledWith(2, [3, 4])
    expect(handler).toHaveBeenNthCalledWith(3, [5])
  })

  it('respects concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const handler = vi.fn(async (batch: number[]) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(r => setTimeout(r, 10))
      inFlight--
      return batch
    })
    const queue = new BatchQueue({ batchSize: 1, concurrency: 2, retries: 0, backoffMs: 0, timeoutMs: 5000, handler })
    await queue.enqueue([1, 2, 3, 4])
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })

  it('retries on handler failure and eventually succeeds', async () => {
    let calls = 0
    const handler = vi.fn(async (batch: number[]) => {
      calls++
      if (calls < 2) throw new Error('temporary failure')
      return batch
    })
    const queue = new BatchQueue({ batchSize: 10, concurrency: 1, retries: 2, backoffMs: 0, timeoutMs: 5000, handler })
    const result = await queue.enqueue([1, 2])
    expect(result).toEqual([1, 2])
    expect(calls).toBe(2)
  })

  it('throws after exhausting retries', async () => {
    const handler = vi.fn(async () => { throw new Error('always fails') })
    const queue = new BatchQueue({ batchSize: 10, concurrency: 1, retries: 1, backoffMs: 0, timeoutMs: 5000, handler })
    await expect(queue.enqueue([1])).rejects.toThrow('always fails')
  })

  it('calls onProgress after each batch', async () => {
    const onProgress = vi.fn()
    const handler = vi.fn(async (batch: number[]) => batch)
    const queue = new BatchQueue({ batchSize: 2, concurrency: 1, retries: 0, backoffMs: 0, timeoutMs: 5000, handler, onProgress })
    await queue.enqueue([1, 2, 3, 4])
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 2, 4)
    expect(onProgress).toHaveBeenNthCalledWith(2, 4, 4)
  })

  it('returns empty array for empty input', async () => {
    const handler = vi.fn(async (b: number[]) => b)
    const queue = new BatchQueue({ batchSize: 5, concurrency: 1, retries: 0, backoffMs: 0, timeoutMs: 5000, handler })
    const result = await queue.enqueue([])
    expect(result).toEqual([])
    expect(handler).not.toHaveBeenCalled()
  })
})
