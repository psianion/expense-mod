import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/import/import.service'
import { confirmRowSchema } from '@server/validators/import.schema'
import { successResponse, handleApiError } from '../../../../../middleware'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; rowId: string } }
) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const input = confirmRowSchema.parse(body)
    const row = await importService.confirmRow(params.rowId, input, user)
    return successResponse({ row })
  } catch (error) {
    return handleApiError(error)
  }
}
