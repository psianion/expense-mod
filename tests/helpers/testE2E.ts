/**
 * E2E UI test helpers for use with Playwright.
 * Use with @playwright/test: pass the `page` fixture into these helpers.
 * For MCP Docker Playwright, the agent can follow the same flow using browser_* tools.
 */
import { E2E_UI_BASE_URL, isE2EUIEnabled } from '@/tests/setup.e2e.ui'

export { E2E_UI_BASE_URL, isE2EUIEnabled }

export function getBaseUrl(): string {
  return E2E_UI_BASE_URL
}

export async function navigateToPage(
  page: { goto: (url: string) => Promise<unknown> },
  path: string
): Promise<unknown> {
  const url = path.startsWith('http') ? path : `${E2E_UI_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  return page.goto(url)
}

export async function navigateToHome(page: { goto: (url: string) => Promise<unknown> }): Promise<unknown> {
  return navigateToPage(page, '/')
}

export async function navigateToExpenses(page: { goto: (url: string) => Promise<unknown> }): Promise<unknown> {
  return navigateToPage(page, '/expenses')
}

export async function navigateToBills(page: { goto: (url: string) => Promise<unknown> }): Promise<unknown> {
  return navigateToPage(page, '/bills')
}

export async function navigateToAnalytics(page: { goto: (url: string) => Promise<unknown> }): Promise<unknown> {
  return navigateToPage(page, '/analytics')
}

export async function navigateToSettings(page: { goto: (url: string) => Promise<unknown> }): Promise<unknown> {
  return navigateToPage(page, '/settings')
}

/** Playwright Page-compatible type for E2E helpers */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type E2EPage = any

/** Wait for an element containing text to be visible */
export async function waitForElement(
  page: E2EPage,
  text: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  await page.getByText(text).waitFor({ state: 'visible', timeout: options?.timeout ?? 5000 })
}

/** Fill a form field by label or placeholder */
export async function fillFormField(
  page: E2EPage,
  by: 'label' | 'placeholder',
  identifier: string | RegExp,
  value: string
): Promise<void> {
  if (by === 'label') {
    await page.getByLabel(identifier).fill(value)
  } else {
    await page.getByPlaceholder(identifier).fill(value)
  }
}

/** Click a button by accessible name */
export async function clickButton(page: E2EPage, name: string | RegExp): Promise<void> {
  await page.getByRole('button', { name }).click()
}

/** Take a snapshot (HTML content); for accessibility tree use MCP browser_snapshot */
export async function takeSnapshot(page: E2EPage): Promise<string> {
  return page.content()
}
