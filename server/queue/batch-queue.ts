// server/queue/batch-queue.ts

export interface BatchQueueConfig<TIn, TOut> {
  batchSize: number
  concurrency: number
  retries: number
  backoffMs: number
  timeoutMs: number
  handler: (batch: TIn[]) => Promise<TOut[]>
  onProgress?: (done: number, total: number) => void
}

export class BatchQueue<TIn, TOut> {
  constructor(private config: BatchQueueConfig<TIn, TOut>) {}

  async enqueue(items: TIn[]): Promise<TOut[]> {
    if (items.length === 0) return []

    const { batchSize, concurrency, retries, backoffMs, timeoutMs, handler, onProgress } = this.config
    const total = items.length
    const batches: TIn[][] = []

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    const results: TOut[][] = new Array(batches.length)
    let done = 0
    let batchIndex = 0

    const runWorker = async (): Promise<void> => {
      while (batchIndex < batches.length) {
        const myIndex = batchIndex++
        const batch = batches[myIndex]
        results[myIndex] = await this.runWithRetry(batch, handler, retries, backoffMs, timeoutMs)
        done += batch.length
        onProgress?.(Math.min(done, total), total)
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, batches.length) }, runWorker)
    await Promise.all(workers)

    return results.flat()
  }

  private async runWithRetry(
    batch: TIn[],
    handler: (b: TIn[]) => Promise<TOut[]>,
    retries: number,
    backoffMs: number,
    timeoutMs: number,
  ): Promise<TOut[]> {
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await Promise.race([
          handler(batch),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('BatchQueue timeout')), timeoutMs)
          ),
        ])
      } catch (err) {
        lastError = err
        if (attempt < retries) {
          const delay = backoffMs * (attempt + 1)
          console.warn(`[BatchQueue] Attempt ${attempt + 1}/${retries + 1} failed, retrying in ${delay}ms`, {
            error: err instanceof Error ? err.message : String(err),
          })
          if (delay > 0) await new Promise(r => setTimeout(r, delay))
        }
      }
    }
    throw lastError
  }
}
