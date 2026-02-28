import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/services/import.service'
import { confirmRowSchema } from '@server/validators/import.schema'
import { successResponse, withApiHandler } from '../../../../../middleware'

export const dynamic = 'force-dynamic'

export const PATCH = withApiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string; rowId: string }> }
) => {
  const user = await requireAuth(request)
  const { rowId } = await context.params
  const body = await request.json()
  const input = confirmRowSchema.parse(body)
  const row = await importService.confirmRow(rowId, input, user)
  return successResponse({ row })
})
