import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { updateExpenseSchema } from '@server/validators/expense.schema'
import { requireAuth } from '@server/auth/context'
import { successResponse, withApiHandler } from '../../middleware'

export const dynamic = 'force-dynamic'

export const PATCH = withApiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  const { id } = await context.params
  if (!id) {
    throw Object.assign(new Error('Expense id is required'), { status: 400 })
  }
  const input = updateExpenseSchema.parse(await request.json())
  const expense = await expenseService.updateExpense(id, input, user)
  return successResponse({ expense })
})

export const DELETE = withApiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  const { id } = await context.params
  if (!id) {
    throw Object.assign(new Error('Expense id is required'), { status: 400 })
  }
  await expenseService.deleteExpense(id, user)
  return successResponse({ deleted: true })
})
