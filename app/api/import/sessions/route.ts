import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/services/import.service'
import { fileUploadSchema } from '@server/validators/import.schema'
import { successResponse, handleApiError } from '../../middleware'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const raw = Object.fromEntries(await request.formData())
    const { file, password } = fileUploadSchema.parse(raw)

    const buffer = Buffer.from(await file.arrayBuffer())
    const { sessionId } = await importService.createSession(buffer, file.name, file.type, user, password)
    return successResponse({ sessionId })
  } catch (error) {
    return handleApiError(error)
  }
}
