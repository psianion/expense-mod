import { test, expect } from '@playwright/test'
import { navigateToHome } from '../../../helpers/testE2E'

test.describe('Expenses Flow - Lifecycle', () => {
  test('can navigate from home to expenses', async ({ page }) => {
    await navigateToHome(page)
    await page.getByRole('link', { name: /expenses/i }).click()
    await expect(page).toHaveURL(/\/expenses/)
  })
})
