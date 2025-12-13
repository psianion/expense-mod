import { NextRequest, NextResponse } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { createExpenseSchema } from '@server/validators/expense.schema'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const input = createExpenseSchema.parse(await request.json())
    const result = await expenseService.createExpense(input)
    return NextResponse.json(result)
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

