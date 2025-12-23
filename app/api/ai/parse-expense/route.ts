import { NextRequest } from 'next/server'
import { ParseExpenseRequest } from '@/types'
import { aiService } from '@server/ai/ai.service'
import { successResponse, handleApiError } from '../../middleware'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { text }: ParseExpenseRequest = await request.json()

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string')
    }

    const result = await aiService.parseExpense({ text })
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

