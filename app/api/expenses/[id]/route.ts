import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { updateExpenseSchema } from '@server/validators/expense.schema'
import { requireAuth } from '@server/auth/context'
import { successResponse, handleApiError } from '../../middleware'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    const { id } = params
    if (!id) {
      throw Object.assign(new Error('Expense id is required'), { status: 400 })
    }
    const input = updateExpenseSchema.parse(await request.json())
    const expense = await expenseService.updateExpense(id, input, user)
    return successResponse({ expense })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    const { id } = params
    if (!id) {
      throw Object.assign(new Error('Expense id is required'), { status: 400 })
    }
    await expenseService.deleteExpense(id, user)
    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
