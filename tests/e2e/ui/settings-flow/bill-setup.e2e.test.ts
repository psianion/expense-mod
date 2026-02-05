import { test, expect } from '@playwright/test'
import { navigateToSettings } from '../../../helpers/testE2E'

test.describe('Settings Flow - Bill Setup', () => {
  test('settings page has bills tab', async ({ page }) => {
    await navigateToSettings(page)
    await expect(page.getByRole('tab', { name: /bills/i })).toBeVisible({ timeout: 10000 })
  })
})
