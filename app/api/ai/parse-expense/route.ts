import { NextRequest } from 'next/server'
import { ParseExpenseRequest } from '@/types'
import { aiService } from '@server/ai/ai.service'
import { successResponse, handleApiError } from '../../middleware'

export const dynamic = 'force-dynamic'

/** Mock parse result for E2E/UI tests when OPENROUTER_API_KEY is not set or to avoid real API calls. */
function mockParseResult(text: string) {
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d+)?)/)
  const amount = amountMatch ? Number(amountMatch[1]) : 0
  return {
    parsed: {
      amount: amount || null,
      datetime: new Date().toISOString().slice(0, 19),
      category: 'Other',
      platform: 'Other',
      payment_method: 'Other',
      type: 'EXPENSE' as const,
      tags: [],
    },
    raw_model_output: `{"amount":${amount},"category":"Other","type":"EXPENSE"}`,
    bill_match: null,
  }
}

export async function POST(request: NextRequest) {
  let text: string | undefined
  try {
    const body: ParseExpenseRequest = await request.json()
    text = body.text

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string')
    }

    if (process.env.E2E_MOCK_AI_PARSE === 'true') {
      return successResponse(mockParseResult(text))
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim()
    if (!apiKey) {
      return successResponse(mockParseResult(text))
    }

    const result = await aiService.parseExpense({ text })
    return successResponse(result)
  } catch (error) {
    if (typeof text === 'string' && text.length > 0) {
      return successResponse(mockParseResult(text))
    }
    return handleApiError(error)
  }
}

