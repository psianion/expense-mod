import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/import/import.service'
import { successResponse, handleApiError } from '../../../../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    const session = await importService.getSession(params.id, user)
    if (session.status === 'PARSING') {
      return handleApiError(new Error('Session is still parsing'), 409)
    }
    const rows = await importService.getRows(params.id, user)
    return successResponse({ rows })
  } catch (error) {
    return handleApiError(error)
  }
}
