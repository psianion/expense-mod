import { test, expect } from '@playwright/test'
import { navigateToSettings } from '../../../helpers/testE2E'

test.describe('Settings Flow - Income Setup', () => {
  test('settings page has income tab', async ({ page }) => {
    await navigateToSettings(page)
    await expect(page.getByRole('tab', { name: /income/i })).toBeVisible({ timeout: 10000 })
  })
})
