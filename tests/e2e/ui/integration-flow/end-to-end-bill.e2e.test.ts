import { test, expect } from '@playwright/test'
import { navigateToBills, navigateToSettings } from '../../../helpers/testE2E'

test.describe('Integration Flow - End-to-End Bill', () => {
  test('full flow: bills page -> settings bills', async ({ page }) => {
    await navigateToBills(page)
    await expect(page).toHaveURL(/\/bills/)
    await navigateToSettings(page)
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByRole('tab', { name: /bills/i })).toBeVisible({ timeout: 5000 })
  })
})
