import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { updateExpenseSchema } from '@server/validators/expense.schema'
import { requireAuth } from '@server/auth/context'
import { successResponse, withApiHandler } from '../../middleware'
import { AppError } from '@/server/lib/errors'

export const dynamic = 'force-dynamic'

export const PATCH = withApiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  const { id } = await context.params
  if (!id) {
    throw new AppError('VALIDATION_ERROR', 'Expense id is required')
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
    throw new AppError('VALIDATION_ERROR', 'Expense id is required')
  }
  await expenseService.deleteExpense(id, user)
  return successResponse({ deleted: true })
})
