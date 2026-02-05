import { test, expect } from '@playwright/test'
import { navigateToHome, navigateToExpenses, clickButton } from '../../../helpers/testE2E'

test.describe('Integration Flow - End-to-End Expense', () => {
  test('full flow: home -> add expense -> expenses page', async ({ page }) => {
    await navigateToHome(page)
    await expect(page.getByText('Quick Add Expense')).toBeVisible()
    await page.getByRole('link', { name: /expenses/i }).first().click()
    await expect(page).toHaveURL(/\/expenses/)
  })
})
