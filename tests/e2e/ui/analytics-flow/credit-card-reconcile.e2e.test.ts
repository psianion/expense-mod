import { test, expect } from '@playwright/test'
import { navigateToAnalytics } from '../../../helpers/testE2E'

test.describe('Analytics Flow - Credit Card Reconcile', () => {
  test('analytics page has reconcile or credit section', async ({ page }) => {
    await navigateToAnalytics(page)
    await expect(
      page.getByText(/reconcile/i).or(page.getByText(/credit/i)).or(page.getByText(/statement/i))
    ).toBeVisible({ timeout: 10000 })
  })
})
