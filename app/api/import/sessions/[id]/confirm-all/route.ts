import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/services/import.service'
import { confirmAllSchema } from '@server/validators/import.schema'
import { successResponse, handleApiError } from '../../../../middleware'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { scope } = confirmAllSchema.parse(body)
    const result = await importService.confirmAll(params.id, scope, user)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
