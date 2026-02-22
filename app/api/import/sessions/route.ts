import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { importService } from '@server/import/import.service'
import { successResponse, handleApiError } from '../../middleware'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return handleApiError(new Error('No file provided'), 400)

    const supported = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    if (!supported.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return handleApiError(new Error('Unsupported file type. Upload CSV or XLSX.'), 422)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { sessionId } = await importService.createSession(buffer, file.name, user)
    return successResponse({ sessionId })
  } catch (error) {
    return handleApiError(error)
  }
}
