import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/services/import.service'
import { successResponse, withApiHandler } from '../../../../middleware'

export const dynamic = 'force-dynamic'

export const GET = withApiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(request)
  const { id } = await context.params
  // V7 fix: status check moved into service.getRows()
  const rows = await importService.getRows(id, user)
  return successResponse({ rows })
})
