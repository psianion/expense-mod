import { parseExpense } from './expense-parser/parser'
import type { ParseExpenseRequest, ParseExpenseResponse } from '@/types'
import { createServiceLogger } from '@/server/lib/logger'

const log = createServiceLogger('AIService')

export class AIService {
  async parseExpense(request: ParseExpenseRequest): Promise<ParseExpenseResponse> {
    log.info({ method: 'parseExpense' }, 'Parsing expense with AI')
    try {
      const result = await parseExpense(request.text)
      log.debug({ method: 'parseExpense' }, 'AI parse complete')
      return result
    } catch (err) {
      log.error({ method: 'parseExpense', err }, 'AI expense parsing failed')
      throw err
    }
  }
}

export const aiService = new AIService()
