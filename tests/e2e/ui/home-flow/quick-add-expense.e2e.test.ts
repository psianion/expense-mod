import { test, expect } from '@playwright/test'
import { navigateToHome, clickButton } from '../../../helpers/testE2E'

test.describe('Home Flow - Quick Add Expense', () => {
  test('home page has Quick Add section', async ({ page }) => {
    await navigateToHome(page)
    await expect(page.getByText('Quick Add Expense')).toBeVisible()
    await expect(page.getByRole('button', { name: /parse & preview/i })).toBeVisible()
  })

  test('can type in quick add textarea and see parse button enabled', async ({ page }) => {
    await navigateToHome(page)
    const textarea = page.getByPlaceholder(/20 rupees chips Swiggy/)
    await textarea.fill('Lunch at Chipotle $12.50')
    await expect(page.getByRole('button', { name: /parse & preview/i })).toBeEnabled()
  })

  test('clicking Parse & Preview triggers parse flow', async ({ page }) => {
    await navigateToHome(page)
    const textarea = page.getByPlaceholder(/20 rupees chips Swiggy/)
    await textarea.fill('Coffee $5')
    await clickButton(page, /parse & preview/i)
    await expect(
      page.getByText(/parsing/i).or(page.getByText('Preview & Edit Expense'))
    ).toBeVisible({ timeout: 15000 })
  })
})
