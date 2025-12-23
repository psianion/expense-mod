import apiClient from './client'
import type { AiParseExpenseRequest, AiParseExpenseResponse } from './types'

// AI API module
export const aiApi = {
  // Parse expense from text using AI
  async parseExpense(data: AiParseExpenseRequest): Promise<AiParseExpenseResponse> {
    const response = await apiClient.post<AiParseExpenseResponse>('/ai/parse-expense', data)
    return response.data
  },
}
