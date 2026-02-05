import { test, expect } from '@playwright/test'
import { navigateToExpenses } from '../../../helpers/testE2E'

test.describe('Expenses Flow - View and Filter', () => {
  test('expenses page loads and shows table or empty state', async ({ page }) => {
    await navigateToExpenses(page)
    await expect(
      page.getByText(/expenses/i).or(page.getByText(/no expenses/i)).or(page.getByRole('table'))
    ).toBeVisible({ timeout: 10000 })
  })
})
