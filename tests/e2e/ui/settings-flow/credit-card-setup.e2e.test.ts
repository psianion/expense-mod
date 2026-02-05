import { test, expect } from '@playwright/test'
import { navigateToSettings } from '../../../helpers/testE2E'

test.describe('Settings Flow - Credit Card Setup', () => {
  test('settings page has credit cards tab', async ({ page }) => {
    await navigateToSettings(page)
    await expect(page.getByRole('tab', { name: /credit card/i })).toBeVisible({ timeout: 10000 })
  })
})
