import type { ParseExpenseRequest, ParseExpenseResponse } from '@/types'
import { parseExpenseResponseFixture } from './testData'

export { parseExpenseResponseFixture }

export function createMockParseExpense(overrides?: Partial<ParseExpenseResponse>) {
  return async (_request: ParseExpenseRequest): Promise<ParseExpenseResponse> => {
    return {
      ...parseExpenseResponseFixture,
      ...overrides,
    }
  }
}

export function getMockParseExpenseModule(overrides?: Partial<ParseExpenseResponse>) {
  return {
    parseExpense: createMockParseExpense(overrides),
  }
}
