/**
 * E2E setup: base URL for the running app.
 * Run with E2E_BASE_URL=http://localhost:3000 when dev server is up.
 * MCP Docker Playwright skills use browser_navigate to this base.
 */
export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export function isE2EEnabled(): boolean {
  return Boolean(process.env.E2E_BASE_URL)
}
