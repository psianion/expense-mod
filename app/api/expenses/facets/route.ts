import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { requireAuth } from '@server/auth/context'
import { successResponse, withApiHandler } from '../../middleware'

export const dynamic = 'force-dynamic'

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const facets = await expenseService.getFacets(user)
  return successResponse(facets)
})
