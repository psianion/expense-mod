# Expense Tracker – Testing Guide

## Overview

This project uses **Vitest** for unit and integration tests, with optional E2E tests when a dev server is running. Cursor **skills** and **commands** help run and debug tests, including with MCP Docker Playwright.

## Quick start

```bash
# Run all tests (unit + integration; E2E skipped unless E2E_BASE_URL is set)
npm run test:run

# Watch mode (re-run on file changes)
npm run test

# With coverage
npm run test:coverage

# Vitest UI
npm run test:ui
```

## Test structure

| Layer        | Directory                  | Description                          |
|-------------|----------------------------|--------------------------------------|
| **Unit**    | `tests/unit/`              | Validators, services, AI parser      |
| **Integration** | `tests/integration/api/` | API route handlers (GET/POST/etc.)   |
| **E2E**     | `tests/e2e/`               | Workflows (run when E2E_BASE_URL set) |

- **Setup**: `tests/setup.ts` – env vars, Supabase mock.
- **Helpers**: `tests/helpers/` – `mockSupabase.ts`, `mockAI.ts`, `testData.ts`, `testDatabase.ts`.

## Writing tests

### Unit tests

- Use `describe` / `it` from `vitest`.
- Import from `@server/`, `@lib/`, `@types/` (path aliases in `vitest.config.ts`).
- For code that uses Supabase, the global mock in `tests/setup.ts` is used; use `clearMockStore()` and `getMockStore()` from setup in `beforeEach` when needed.

### Integration tests

- Import route handlers from `@/app/api/.../route` (e.g. `GET`, `POST`).
- Build `NextRequest` with the right URL, method, and body.
- Assert on `res.status` and `await res.json()`.

### E2E tests

- In `tests/e2e/` use `describe.skipIf(!isE2EEnabled())` so they only run when `E2E_BASE_URL` is set.
- Use `fetch(E2E_BASE_URL + '/api/...')` for API checks.
- For full UI E2E, use the **debug-tests** skill with MCP Docker browser tools (navigate, snapshot, click, screenshot).

## Mocking

- **Supabase**: Mocked in `tests/setup.ts` with an in-memory store. No real DB for unit/integration.
- **AI (parse-expense)**: In `tests/integration/api/ai-parse-expense.test.ts`, `@server/ai/ai.service` is mocked so OpenRouter is not called.

## Cursor integration

### Commands (`.cursor/commands/`)

- **test-all.md** – Run full suite and report results.
- **test-debug.md** – Debug failures using MCP Docker Playwright.
- **test-watch.md** – Start Vitest watch mode.
- **test-endpoint.md** – Run tests for one endpoint (e.g. expenses, bills).

### Skills (`.cursor/skills/`)

- **run-tests** – How to run tests and report pass/fail.
- **debug-tests** – How to use MCP browser tools to debug E2E failures.
- **test-report** – How to generate a markdown test report.
- **test-endpoint** – How to map “test X” to the right test file and run it.

## Running E2E tests

1. Start the app: `npm run dev`.
2. In another terminal: `E2E_BASE_URL=http://localhost:3000 npx vitest run tests/e2e` (or use the **test-e2e** Cursor command).

## CI (future)

- Add a job that runs `npm run test:run` (and optionally `npm run test:coverage`).
- For E2E in CI, start the app and set `E2E_BASE_URL` before running `tests/e2e`.
