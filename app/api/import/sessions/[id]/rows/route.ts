import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/services/import.service'
import { successResponse, handleApiError } from '../../../../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    // V7 fix: status check moved into service.getRows()
    const rows = await importService.getRows(params.id, user)
    return successResponse({ rows })
  } catch (error) {
    return handleApiError(error)
  }
}
