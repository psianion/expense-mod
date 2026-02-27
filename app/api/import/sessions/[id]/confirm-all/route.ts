import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/services/import.service'
import { confirmAllSchema } from '@server/validators/import.schema'
import { successResponse, withApiHandler } from '../../../../middleware'

export const dynamic = 'force-dynamic'

export const POST = withApiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireAuth(request)
  const { id } = await context.params
  const body = await request.json()
  const { scope } = confirmAllSchema.parse(body)
  const result = await importService.confirmAll(id, scope, user)
  return successResponse(result)
})
