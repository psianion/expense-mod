import { test, expect } from '@playwright/test'
import { navigateToBills, navigateToExpenses } from '../../../helpers/testE2E'

test.describe('Bills Flow - Bill to Expense', () => {
  test('can navigate between bills and expenses', async ({ page }) => {
    await navigateToBills(page)
    await expect(page).toHaveURL(/\/bills/)
    await page.getByRole('link', { name: /expenses/i }).first().click()
    await expect(page).toHaveURL(/\/expenses/)
  })
})
