import { test, expect } from '@playwright/test'
import { navigateToExpenses, navigateToPage } from '../../../helpers/testE2E'

test.describe('Expenses Flow - View and Filter', () => {
  test('expenses page loads and shows table or empty state', async ({ page }) => {
    await navigateToExpenses(page)
    await expect(
      page.getByRole('table').or(page.getByText(/no expenses/i))
    ).toBeVisible({ timeout: 10000 })
  })

  test('search input exists and updates URL', async ({ page }) => {
    await navigateToExpenses(page)
    const searchInput = page.getByPlaceholder('Search expenses...')
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('food')
    // Wait for debounce to fire before checking URL
    await page.waitForTimeout(400)
    await expect(page).toHaveURL(/search=food/)
  })

  test('type filter updates URL', async ({ page }) => {
    await navigateToExpenses(page)
    // Wait for the page to stabilise before interacting with comboboxes
    await expect(
      page.getByRole('table').or(page.getByText(/no expenses/i))
    ).toBeVisible({ timeout: 10000 })
    // The type combobox is the first combobox on the page (after the search input)
    const typeCombobox = page.getByRole('combobox').nth(0)
    await typeCombobox.click()
    await page.getByRole('option', { name: 'Expenses' }).click()
    await expect(page).toHaveURL(/type=EXPENSE/)
  })

  test('advanced filters panel toggles', async ({ page }) => {
    await navigateToExpenses(page)
    await expect(
      page.getByRole('table').or(page.getByText(/no expenses/i))
    ).toBeVisible({ timeout: 10000 })
    // Advanced panel should be hidden by default
    await expect(page.getByText('All platforms')).not.toBeVisible()
    await page.getByRole('button', { name: /filters/i }).click()
    await expect(page.getByText('All platforms')).toBeVisible()
  })

  test('pagination controls appear when there are results', async ({ page }) => {
    await navigateToExpenses(page)
    const table = page.getByRole('table')
    // Only assert pagination when the table has at least one data row (header + 1 data row = 2 rows)
    const tableVisible = await table.isVisible({ timeout: 10000 }).catch(() => false)
    if (tableVisible) {
      const rows = table.getByRole('row')
      const rowCount = await rows.count()
      if (rowCount > 1) {
        await expect(page.getByText('Rows per page:')).toBeVisible()
      }
    }
  })

  test('clear all filters button resets URL', async ({ page }) => {
    await navigateToPage(page, '/expenses?type=EXPENSE')
    // "Clear all" badge/button should appear because a filter is pre-applied
    const clearAllButton = page.getByRole('button', { name: /clear all/i })
    await expect(clearAllButton).toBeVisible({ timeout: 10000 })
    await clearAllButton.click()
    await expect(page).not.toHaveURL(/type=EXPENSE/)
  })
})
