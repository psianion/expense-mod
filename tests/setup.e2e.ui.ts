/**
 * E2E UI test setup for browser-based tests.
 * Used when running tests/e2e/ui/ with Playwright MCP tools.
 * Base URL for the running app; browser is controlled via MCP (e.g. browser_navigate).
 * When MCP browser runs from Docker, set E2E_UI_BASE_URL=http://host.docker.internal:3000
 * (localhost is not reachable from inside the container).
 */
export const E2E_UI_BASE_URL = process.env.E2E_UI_BASE_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export function isE2EUIEnabled(): boolean {
  return Boolean(process.env.E2E_UI_BASE_URL ?? process.env.E2E_BASE_URL)
}
