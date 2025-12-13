import { NextRequest, NextResponse } from 'next/server'
import { ParseExpenseRequest, ParseExpenseResponse } from '../../../../types'
import { aiService } from '@server/ai/ai.service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { text }: ParseExpenseRequest = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const result = await aiService.parseExpense({ text })

    return NextResponse.json(result as ParseExpenseResponse)
  } catch (error) {
    console.error('AI service error:', error)
    return NextResponse.json({ error: 'Failed to parse expense' }, { status: 500 })
  }
}

