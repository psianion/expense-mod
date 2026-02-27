import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { createExpenseSchema } from '@server/validators/expense.schema'
import { requireAuth } from '@server/auth/context'
import { successResponse, withApiHandler } from '../middleware'

export const dynamic = 'force-dynamic'

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const sp = request.nextUrl.searchParams

  const filters = {
    type: (sp.get('type') as 'EXPENSE' | 'INFLOW') || undefined,
    category: sp.get('category') || undefined,
    platform: sp.get('platform') || undefined,
    payment_method: sp.get('payment_method') || undefined,
    date_from: sp.get('date_from') || undefined,
    date_to: sp.get('date_to') || undefined,
    source: (sp.get('source') as 'MANUAL' | 'AI' | 'RECURRING') || undefined,
    bill_instance_id: sp.get('bill_instance_id') || undefined,
    search: sp.get('search') || undefined,
    sort_by: (sp.get('sort_by') as 'datetime' | 'amount' | 'category') || undefined,
    sort_order: (sp.get('sort_order') as 'asc' | 'desc') || undefined,
    page: sp.get('page') ? parseInt(sp.get('page')!) : undefined,
    limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
    offset: sp.get('offset') ? parseInt(sp.get('offset')!) : undefined,
  }

  const { expenses, total } = await expenseService.getExpenses(filters, user)
  return successResponse({ expenses, total })
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const input = createExpenseSchema.parse(await request.json())
  const result = await expenseService.createExpense(input, user)
  return successResponse(result)
})

