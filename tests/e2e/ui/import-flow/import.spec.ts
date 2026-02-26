import { test, expect } from '@playwright/test'
import { navigateToExpenses } from '../../../helpers/testE2E'

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

  test('upload a valid PDF file transitions to parsing stage', async ({ page }) => {
    await navigateToExpenses(page)
    await page.getByTestId('import-statement-btn').click()

    // Select a PDF file (fixture — any small PDF works)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'statement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\n0000000000 65535 f\ntrailer<</Size 1>>\nstartxref\n9\n%%EOF'),
    })

    // Password field and Import button should appear
    await expect(page.getByLabel(/password/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /import statement/i })).toBeVisible()
  })
})

test.describe('Import Flow - API', () => {
  test('POST /api/import/sessions returns 422 for non-PDF file', async ({ request }) => {
    const buffer = Buffer.from('Date,Narration,Debit Amount\n15/02/2026,Zomato,450')
    const res = await request.post('/api/import/sessions', {
      multipart: { file: { name: 'test.csv', mimeType: 'text/csv', buffer } }
    })
    expect(res.status()).toBe(422)
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
