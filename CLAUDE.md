# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Vitest watch mode
npm run test:run         # Vitest once (CI)
npm run test:coverage    # Coverage report
npm run test:ui-comp     # Component/UI tests
npm run test:ui-e2e      # Playwright E2E tests
npm run test:all         # Unit + UI tests
```

To run a single Vitest test file: `npx vitest run tests/unit/path/to/file.test.ts`
To run a single Playwright test: `npx playwright test tests/e2e/ui/expenses.spec.ts`

## Environment Setup

Copy `.env.example` to `.env`. Three required vars to start:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project
- `NEXT_PUBLIC_APP_MODE` — `DEMO` | `PUBLIC` | `MASTER`

In **DEMO** mode, set `DEMO_USER_ID` to a fixed UUID; no auth UI is shown. Tests run in DEMO mode by default (see `tests/setup.ts`).

Run `sql/init.sql` in Supabase SQL editor to initialize the schema. Migrations are in `sql/migrations/`.

## Architecture

**Layered structure — strictly follow the dependency flow:**

```
Component / Page
  → React Query hook (lib/query/hooks/)
    → API module (lib/api/)
      → API Route (app/api/)
        → Service (server/services/*.service.ts)
          → Repository (server/db/repositories/*.repo.ts)
            → Supabase client (server/db/supabase.ts)
```

API routes are thin: they validate input with Zod, call a service, and return via `successResponse()` or `handleApiError()`.

Services hold all business logic. Repositories hold all database queries. Never query the database from routes or components directly.

**Feature modules** (`features/expenses/`, `features/bills/`, `features/analytics/`, `features/settings/`) contain feature-specific components, hooks, and logic. Shared UI primitives live in `components/ui/` (shadcn/ui, new-york style).

**React Query** is used for all server state. Query keys are defined in `lib/query/queryKeys.ts` — always use that factory rather than inline strings. Stale time is 1 minute; use optimistic updates for mutations.

**AI parsing** (`server/ai/`) uses OpenRouter (not OpenAI directly) to parse natural-language expense input. `OPENROUTER_API_KEY` is optional — the form falls back to manual entry.

**Auth modes:**
- `DEMO` — Fixed single user (`DEMO_USER_ID`), no login screen
- `PUBLIC` — Supabase Auth (email magic link + Google OAuth), multi-tenant
- `MASTER` — Single admin, first registered user gets full access

Auth context is resolved server-side in `server/auth/context.ts`. All tables have `user_id` columns prepared for Row-Level Security.

## Key Conventions

**File naming:** `kebab-case` for files, `PascalCase` for React components. Server files use suffixes: `.service.ts`, `.repo.ts`, `.schema.ts`.

**Validation:** Zod schemas live in `server/validators/`. Always validate at the API boundary; don't duplicate validation in services.

**API responses:** Use `successResponse()` and `handleApiError()` from the shared helper — don't return raw JSON.

**Styling:** Tailwind with CSS variables (defined in `styles/globals.css`). Use `cn()` (clsx + tailwind-merge) for conditional classes. Dark mode is supported via `next-themes`.

**Bills vs Expenses:** `bills` are recurring templates; `bill_instances` are individual occurrences. Confirming a bill instance creates an expense record.

**Cron endpoint:** `POST /api/cron/bills` auto-posts due bills. Requires `CRON_SECRET` header. Recommended schedule: daily at 05:00 UTC.
