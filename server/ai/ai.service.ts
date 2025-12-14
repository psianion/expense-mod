import { parseExpense } from './expense-parser/parser'
import type { ParseExpenseRequest, ParseExpenseResponse } from '@/types'

export class AIService {
  async parseExpense(request: ParseExpenseRequest): Promise<ParseExpenseResponse> {
    return parseExpense(request.text)
  }
}

export const aiService = new AIService()
