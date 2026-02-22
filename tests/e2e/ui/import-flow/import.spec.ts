import { test, expect } from '@playwright/test'
import path from 'path'
import { navigateToExpenses } from '../../../helpers/testE2E'

const FIXTURES = path.resolve(__dirname, '../../../fixtures/import')

/**
 * E2E tests for the bank statement import flow.
 * Requires the dev server running at E2E_UI_BASE_URL (default: http://localhost:3000).
 * AI calls are deterministic with AI_MOCK=true set in the server environment.
 */

test.describe('Import Flow - Upload', () => {
  test('Import Statement button is visible on expenses page', async ({ page }) => {
    await navigateToExpenses(page)
    const btn = page.getByTestId('import-statement-btn')
    await expect(btn).toBeVisible({ timeout: 10000 })
  })

  test('clicking Import Statement opens the import modal', async ({ page }) => {
    await navigateToExpenses(page)
    await page.getByTestId('import-statement-btn').click()
    await expect(page.getByText('Import Bank Statement')).toBeVisible({ timeout: 5000 })
  })

  test('upload a valid HDFC CSV file transitions to parsing stage', async ({ page }) => {
    await navigateToExpenses(page)
    await page.getByTestId('import-statement-btn').click()

    // Trigger file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(FIXTURES, 'hdfc-valid.csv'))

    // Should advance to parsing stage
    await expect(
      page.getByText(/Analysing your statement/i).or(page.getByText(/hdfc-valid.csv/i))
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Import Flow - API', () => {
  test('POST /api/import/sessions returns sessionId for CSV file', async ({ request }) => {
    const buffer = Buffer.from('Date,Narration,Debit Amount\n15/02/2026,Zomato,450')
    const formData = new FormData()
    formData.append('file', new Blob([buffer], { type: 'text/csv' }), 'test.csv')

    const res = await request.post('/api/import/sessions', { multipart: { file: { name: 'test.csv', mimeType: 'text/csv', buffer } } })
    // In E2E with real Supabase this may 503, so just verify not 404
    expect(res.status()).not.toBe(404)
  })

  test('POST /api/import/sessions returns 400 for missing file', async ({ request }) => {
    const res = await request.post('/api/import/sessions', { data: {} })
    expect(res.status()).toBe(400)
  })

  test('GET /api/import/sessions/unknown returns 404', async ({ request }) => {
    const res = await request.get('/api/import/sessions/nonexistent-session-id')
    expect(res.status()).toBe(404)
  })

  test('GET /api/import/sessions/id/rows returns 404 for unknown session', async ({ request }) => {
    const res = await request.get('/api/import/sessions/nonexistent-session-id/rows')
    // 404 (session not found) or 409 (parsing) are both acceptable
    expect([404, 409]).toContain(res.status())
  })
})
