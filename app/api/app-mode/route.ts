import { getAppMode } from '@lib/config'
import { successResponse, withApiHandler } from '../middleware'

export const dynamic = 'force-dynamic'

/**
 * Returns the app mode (DEMO | PUBLIC | MASTER) from server env.
 * Client uses this so DEMO works even when NEXT_PUBLIC_APP_MODE is not inlined correctly.
 */
export const GET = withApiHandler(async () => {
  const appMode = getAppMode()
  return successResponse({ appMode })
})
