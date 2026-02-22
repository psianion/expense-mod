import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { requireAuth } from '@server/auth/context'
import { successResponse, handleApiError } from '../../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const facets = await expenseService.getFacets(user)
    return successResponse(facets)
  } catch (error) {
    return handleApiError(error)
  }
}
