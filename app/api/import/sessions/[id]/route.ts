import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/services/import.service'
import { successResponse, handleApiError } from '../../../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const session = await importService.getSession(id, user)
    return successResponse({ session })
  } catch (error) {
    return handleApiError(error)
  }
}
