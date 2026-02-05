import { test, expect } from '@playwright/test'
import { navigateToAnalytics } from '../../../helpers/testE2E'

test.describe('Analytics Flow - View Analytics', () => {
  test('analytics page loads', async ({ page }) => {
    await navigateToAnalytics(page)
    await expect(
      page.getByText(/analytics/i).or(page.getByText(/spending/i)).or(page.getByText(/trend/i))
    ).toBeVisible({ timeout: 10000 })
  })
})
