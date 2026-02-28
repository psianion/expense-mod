import { successResponse, withApiHandler } from '../middleware'

export const GET = withApiHandler(async () => {
  return successResponse({ message: 'Test route works' })
})

export const POST = withApiHandler(async () => {
  return successResponse({ message: 'POST test works' })
})
