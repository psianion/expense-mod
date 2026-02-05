import { test, expect } from '@playwright/test'
import { navigateToBills } from '../../../helpers/testE2E'

test.describe('Bills Flow - Instance Management', () => {
  test('bills page loads', async ({ page }) => {
    await navigateToBills(page)
    await expect(
      page.getByText(/bills/i).or(page.getByRole('table')).or(page.getByText(/no bills/i))
    ).toBeVisible({ timeout: 10000 })
  })
})
