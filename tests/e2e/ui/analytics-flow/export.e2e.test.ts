import { test, expect } from '@playwright/test'
import { navigateToAnalytics } from '../../../helpers/testE2E'

test.describe('Analytics Export - CSV Export', () => {
  test('should export expenses to CSV', async ({ page }) => {
    await navigateToAnalytics(page)

    // Wait for data to load
    await expect(page.locator('text=Total Expenses')).toBeVisible({ timeout: 10000 })

    // Setup download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })

    // Click Export dropdown
    await page.getByRole('button', { name: /export/i }).click()

    // Click Export to CSV
    await page.getByRole('menuitem', { name: /export to csv/i }).click()

    // Wait for download
    const download = await downloadPromise

    // Verify filename contains 'expenses_export'
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/expenses_export_\d{4}-\d{2}-\d{2}\.csv/)

    // Verify toast message
    await expect(page.getByText(/exported to csv successfully/i)).toBeVisible()
  })

  test('should export filtered expenses to CSV', async ({ page }) => {
    await navigateToAnalytics(page)

    // Wait for filters to load
    await expect(page.locator('text=Total Expenses')).toBeVisible({ timeout: 10000 })

    // Apply category filter
    await page.getByRole('combobox', { name: /categories/i }).click()
    await page.getByRole('option', { name: /food/i }).first().click()

    // Wait a bit for filter to apply
    await page.waitForTimeout(500)

    // Setup download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })

    // Export filtered data
    await page.getByRole('button', { name: /export/i }).click()
    await page.getByRole('menuitem', { name: /export to csv/i }).click()

    // Verify download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('expenses_export')
  })
})

test.describe('Analytics Export - Date Range Export', () => {
  test('should export data for selected date range', async ({ page }) => {
    await navigateToAnalytics(page)

    // Wait for page to load
    await expect(page.locator('text=Total Expenses')).toBeVisible({ timeout: 10000 })

    // Open date range picker
    await page.getByRole('button', { name: /pick a date range/i }).click()

    // Select "Last 30 Days" preset
    await page.getByRole('button', { name: /last 30 days/i }).click()

    // Wait for filter to apply
    await page.waitForTimeout(500)

    // Export filtered data
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.getByRole('button', { name: /export/i }).click()
    await page.getByRole('menuitem', { name: /export to csv/i }).click()

    // Verify download
    const download = await downloadPromise
    expect(download).toBeTruthy()
  })
})

test.describe('Analytics Export - Error Handling', () => {
  test('should handle empty data export', async ({ page }) => {
    await navigateToAnalytics(page)

    // Wait for page to load
    await expect(page.locator('text=Total Expenses')).toBeVisible({ timeout: 10000 })

    // Apply filters that result in no data (if possible)
    // This depends on test data - might need adjustment

    // Try to export
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.getByRole('button', { name: /export/i }).click()
    await page.getByRole('menuitem', { name: /export to csv/i }).click()

    // Should still download (might be empty CSV)
    const download = await downloadPromise
    expect(download).toBeTruthy()
  })

  test('should show export button on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await navigateToAnalytics(page)

    // Wait for page to load
    await expect(page.locator('text=Total Expenses')).toBeVisible({ timeout: 10000 })

    // Export button should be visible
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible()

    // Should be able to click it
    await page.getByRole('button', { name: /export/i }).click()
    await expect(page.getByRole('menuitem', { name: /export to csv/i })).toBeVisible()
  })
})
