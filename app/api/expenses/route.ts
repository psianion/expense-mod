import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { createExpenseSchema } from '@server/validators/expense.schema'
import { requireAuth } from '@server/auth/context'
import { successResponse, handleApiError } from '../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const typeFilter = request.nextUrl.searchParams.get('type')
    const categoryFilter = request.nextUrl.searchParams.get('category')
    const platformFilter = request.nextUrl.searchParams.get('platform')
    const paymentMethodFilter = request.nextUrl.searchParams.get('payment_method')
    const dateFrom = request.nextUrl.searchParams.get('date_from')
    const dateTo = request.nextUrl.searchParams.get('date_to')
    const sourceFilter = request.nextUrl.searchParams.get('source')
    const billInstanceIdFilter = request.nextUrl.searchParams.get('bill_instance_id')
    const limit = request.nextUrl.searchParams.get('limit') ? parseInt(request.nextUrl.searchParams.get('limit')!) : undefined
    const offset = request.nextUrl.searchParams.get('offset') ? parseInt(request.nextUrl.searchParams.get('offset')!) : undefined

    const filters = {
      type: typeFilter as 'EXPENSE' | 'INFLOW' | undefined,
      category: categoryFilter || undefined,
      platform: platformFilter || undefined,
      payment_method: paymentMethodFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      source: sourceFilter as 'MANUAL' | 'AI' | 'RECURRING' | undefined,
      bill_instance_id: billInstanceIdFilter || undefined,
      limit,
      offset,
    }

    const result = await expenseService.getExpenses(filters, user)
    return successResponse({ expenses: result })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const input = createExpenseSchema.parse(await request.json())
    const result = await expenseService.createExpense(input, user)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

