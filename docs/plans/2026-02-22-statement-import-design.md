# Statement Import Feature — Design Doc
**Date:** 2026-02-22
**Status:** Approved for implementation

---

## Overview

A CSV/XLSX import pipeline that ingests bank and card statements, classifies each transaction using a rules-first + AI-fallback approach, and presents a staged modal UI for review and confirmation into the expenses table.

**Key decisions:**
- CSV/Excel first (PDF deferred to later phase)
- Hybrid confidence model: rule engine → AI batch fallback (free tier Mistral via existing OpenRouter)
- Recurring charges flagged, not auto-created as bills (user stays in control)
- Field-level confidence indicators (green/yellow/red) for review
- Staged modal UI with smooth Motion animations (no step wizard)
- Generic reusable `BatchQueue` as the queuing primitive

---

## Section 1 — Architecture & Data Flow

```
User uploads CSV/XLSX
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  FileParser  (server/import/file-parser.ts)         │
│  · detect bank format via header fingerprinting     │
│    (HDFC → ICICI → AXIS → SBI → KOTAK → GENERIC)   │
│  · normalize → RawImportRow[]                       │
│  · GENERIC: returns raw row, user maps columns in UI│
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  RuleClassifier  (server/import/rule-classifier.ts) │
│  · amount sign / debit+credit columns → type        │
│  · merchant keyword dictionary → category, platform │
│  · narration patterns → payment_method              │
│  · same merchant 2+ times → recurring_flag          │
│  · outputs per-field confidence scores (0.0–1.0)    │
│  · rows where ALL fields ≥ 0.80 → auto_import queue │
│  · any field < 0.80 → ai_fallback queue             │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  BatchQueue + AIClassificationQueue                 │
│  (server/queue/)                                    │
│  · generic BatchQueue<TIn, TOut>:                   │
│    batchSize=25, concurrency=2, retries=2,          │
│    backoffMs=1000, timeoutMs=15000                  │
│  · AIClassificationQueue wraps BatchQueue with      │
│    Mistral prompt (reuses existing OpenRouter client)│
│  · AI fills only gaps — rule-confident fields       │
│    are NOT re-classified                            │
│  · onProgress → UPDATE import_sessions.progress    │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  import_sessions + import_rows (DB staging)         │
│  · sessionId returned immediately after session     │
│    insert — pipeline runs async in background       │
│  · progress_done / progress_total polled by client  │
└─────────────────────────────────────────────────────┘
        │
        ▼
   Staged Modal UI → user reviews/edits → expenses
```

### New files

```
server/
  queue/
    batch-queue.ts              ← generic reusable queue
    ai-classification-queue.ts  ← Mistral-specific config
  import/
    file-parser.ts
    rule-classifier.ts
    import.service.ts
    bank-formats/
      hdfc.ts
      icici.ts
      axis.ts
      sbi.ts
      kotak.ts
      generic.ts
app/api/import/
  sessions/
    route.ts                    ← POST
    [id]/
      route.ts                  ← GET (metadata+progress)
      rows/
        route.ts                ← GET (full rows)
        [rowId]/route.ts        ← PATCH
      confirm-all/route.ts      ← POST
features/import/
  components/
    ImportModal.tsx
    ImportStage1Upload.tsx
    ImportStage2Parsing.tsx
    ImportStage3Review.tsx
    ColumnMapper.tsx
    ReviewTable.tsx
    ConfidenceIndicator.tsx
  hooks/
    useImportSession.ts
    useImportRows.ts
    useConfirmRow.ts
    useConfirmAll.ts
```

---

## Section 2 — DB Schema

```sql
CREATE TABLE import_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NULL,
  status         text NOT NULL DEFAULT 'PARSING'
                 CHECK (status IN ('PARSING', 'REVIEWING', 'COMPLETE', 'FAILED')),
  source_file    text NOT NULL,
  bank_format    text NULL,   -- 'HDFC'|'ICICI'|'AXIS'|'SBI'|'KOTAK'|'GENERIC'
  row_count      int NOT NULL DEFAULT 0,
  auto_count     int NOT NULL DEFAULT 0,
  review_count   int NOT NULL DEFAULT 0,
  progress_done  int NOT NULL DEFAULT 0,
  progress_total int NOT NULL DEFAULT 0,
  expires_at     timestamptz DEFAULT now() + interval '24 hours',
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE import_rows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'CONFIRMED', 'SKIPPED')),
  raw_data          jsonb NOT NULL,         -- original CSV row preserved
  amount            numeric(12,2),
  datetime          timestamptz,
  type              text,                   -- 'EXPENSE' | 'INFLOW'
  category          text,
  platform          text,
  payment_method    text,
  notes             text,
  tags              text[] DEFAULT '{}',
  recurring_flag    boolean DEFAULT false,  -- flagged as possible recurring charge
  confidence        jsonb NOT NULL DEFAULT '{}',  -- per-field scores { category: 0.95, ... }
  classified_by     text NOT NULL DEFAULT 'RULE', -- 'RULE' | 'AI' | 'MANUAL'
  posted_expense_id uuid NULL REFERENCES expenses(id),
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX import_rows_session_id_idx ON import_rows (session_id);
CREATE INDEX import_rows_status_idx ON import_rows (status);
```

**Notes:**
- `user_id` omitted from `import_rows` — join through `session_id` instead
- `progress_done`/`progress_total` as plain ints (not jsonb) for clean SQL updates
- `expires_at` for orphan cleanup (sessions abandoned during PARSING/REVIEWING)
- `ON DELETE CASCADE` ensures rows are cleaned up with their session

---

## Section 3 — API Routes

All routes: validate with Zod → call service → `successResponse()` / `handleApiError()`.

```
POST   /api/import/sessions
  body: FormData { file: File }
  → parse file, create session, kick off pipeline async
  → 200: { sessionId: string }
  errors: 400 (missing file), 422 (unsupported type)

GET    /api/import/sessions/:id
  → session metadata + progress only (no rows)
  → polled every 1.5s by useImportSession while status=PARSING
  → 200: { id, status, bank_format, row_count, auto_count,
           review_count, progress_done, progress_total }
  errors: 404

GET    /api/import/sessions/:id/rows
  → full rows with confidence scores
  → fetched ONCE when status transitions to REVIEWING
  → 200: { rows: ImportRow[] }
  errors: 404, 409 (session not yet REVIEWING)

PATCH  /api/import/sessions/:id/rows/:rowId
  body: { action: 'CONFIRM' | 'SKIP', fields?: Partial<ImportRow> }
  → CONFIRM: writes to expenses, sets posted_expense_id, marks CONFIRMED
  → SKIP: marks SKIPPED
  → 200: { row: ImportRow }
  errors: 404, 422

POST   /api/import/sessions/:id/confirm-all
  body: { scope: 'AUTO' | 'ALL' }
  → AUTO: confirms only rule-classified rows (classified_by='RULE')
  → ALL: confirms all PENDING rows
  → bulk inserts to expenses, marks rows CONFIRMED
  → marks session COMPLETE
  → 200: { imported: number }
  errors: 404
```

---

## Section 4 — Classifier Pipeline Internals

### FileParser + Bank Format Detection

```ts
interface BankFormat {
  id: 'HDFC' | 'ICICI' | 'AXIS' | 'SBI' | 'KOTAK' | 'GENERIC'
  detect: (headers: string[]) => boolean
  map: (row: Record<string, string>) => RawImportRow
}

// Detection order — most specific first, GENERIC always last
// HDFC:  ['Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance']
// ICICI: ['Transaction Date', 'Description', 'Debit', 'Credit', 'Balance']
// AXIS:  ['Tran Date', 'Particulars', 'Debit', 'Credit', 'Balance']
// SBI:   ['Txn Date', 'Description', 'Debit', 'Credit', 'Balance']
// KOTAK: ['Transaction Date', 'Description', 'Debit Amount', 'Credit Amount']
```

### RuleClassifier Confidence Thresholds

| Field | Rule | Confidence |
|---|---|---|
| type | debit column → EXPENSE, credit → INFLOW | 1.0 |
| type | single col, negative → EXPENSE | 0.9 |
| category | known merchant match (zomato/swiggy/netflix/etc.) | 0.85–0.95 |
| platform | UPI ref parsed merchant name | 0.85 |
| payment_method | "UPI"/"NEFT"/"RTGS"/"ATM" in narration | 1.0 |
| payment_method | from credit card statement | 1.0 |
| recurring_flag | same merchant 2+ times in file | signal only |

**Auto-import threshold:** all fields ≥ 0.80. Any field below → AI fallback queue.

### BatchQueue (generic, reusable)

```ts
class BatchQueue<TIn, TOut> {
  constructor(config: {
    batchSize: number        // rows per AI call
    concurrency: number      // parallel batches in flight
    retries: number          // per-batch retries
    backoffMs: number        // retry delay
    timeoutMs: number        // per-batch timeout
    handler: (batch: TIn[]) => Promise<TOut[]>
    onProgress?: (done: number, total: number) => void
  })
  async enqueue(items: TIn[]): Promise<TOut[]>
}

// Interface matches BullMQ job shape — swap backend without touching callers
// Future uses: PDFExtractionQueue, BillAutoPostQueue, AnalyticsRollupQueue
```

### Pipeline Orchestration (import.service.ts)

```
createSession(file) — returns sessionId immediately after step 2:
  1. parse CSV/XLSX → FileParser → RawImportRow[]
  2. INSERT import_session (status: PARSING) ← sessionId returned here
  3. bulk INSERT import_rows (raw_data only)
  4. RuleClassifier → split auto[] + fallback[]
  5. UPDATE auto rows (classified_by: RULE, confidence)
  6. aiClassificationQueue.enqueue(fallback[]) → fills gaps
     onProgress → UPDATE import_sessions progress_done/progress_total
  7. UPDATE session status → REVIEWING
```

Steps 3–7 run async. Client polls GET `/sessions/:id` and sees progress climb.

---

## Section 5 — React Query Frontend

### Hooks

```ts
// Drives the import flow — polls while PARSING, stops on REVIEWING
useImportSession(sessionId: string | null) {
  refetchInterval: (data) => data?.status === 'PARSING' ? 1500 : false
}

// Fetches rows once — enabled only when session is REVIEWING
useImportRows(sessionId: string | null) {
  enabled: session?.status === 'REVIEWING'
}

// Per-row optimistic confirm/skip
useConfirmRow() → PATCH /sessions/:id/rows/:rowId
  onMutate: optimistic local flip
  onError: rollback

// Bulk confirm → invalidate expenses
useConfirmAll() → POST /sessions/:id/confirm-all
  onSuccess: queryClient.invalidateQueries(queryKeys.expenses.all)
```

### Query Keys (extend queryKeys.ts)

```ts
importSessions: {
  detail: (id: string) => ['import-sessions', id],
  rows:   (id: string) => ['import-sessions', id, 'rows'],
}
```

---

## Section 6 — Staged Modal UI

### Stages

```
STAGE 1: UPLOAD (max-w-md, compact)
  · Dropzone — drag/drop or browse
  · Shows detected bank format on file selection
  · ColumnMapper shown inline if GENERIC format detected
  · Escape closes modal

STAGE 2: PARSING (max-w-md, same size)
  · Full content swap — dropzone is gone entirely
  · Progress bar: progress_done / progress_total
  · Live counters: "✓ 41 auto-classified  ⚠ 23 need review"
  · Escape → confirm dialog ("Parsing in progress — cancel?")

STAGE 3: REVIEW (expands to max-w-4xl with smooth width transition)
  · Review table — rows animate in staggered as they arrive
  · Per-field confidence: 🟢 ≥0.80 (rule)  🟡 AI-classified  🔴 <0.60
  · Click any 🟡/🔴 field → in-place input/select/combobox
  · Tab → jumps to next uncertain field across rows
  · Enter → confirms field (optimistic update)
  · Sticky counter: "⚠ 12 rows still need attention"
  · Actions: [Skip All Red]  [Confirm Auto]  [Save & Import]
  · Escape closes (import continues in background)
```

### Animations (Motion — already in deps)

```ts
const stageVariants = {
  enter:  { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:   { opacity: 0, x: -40, transition: { duration: 0.18, ease: 'easeIn' } },
}
// AnimatePresence wraps stage content — keyed by stage name
// Stage 3 modal width expands via motion layout animation
// Review table rows: staggerChildren 0.04s delay per row
```

---

## Section 7 — Testing Strategy

### Unit Tests

| Module | What to test |
|---|---|
| FileParser | header detection per bank, correct column mapping, GENERIC fallback |
| RuleClassifier | known merchants → correct category + confidence; UPI pattern extraction; recurring flag on 2+ same merchant |
| BatchQueue | correct chunking, concurrency cap, retry on throw, onProgress called per batch, positional output order |
| import.service | session status transitions, auto vs fallback split, progress updates (mocked deps) |

### API Route Tests

| Route | Cases |
|---|---|
| POST /sessions | valid CSV → sessionId; missing file → 400; bad type → 422 |
| GET /sessions/:id | known → correct shape; unknown → 404 |
| GET /sessions/:id/rows | REVIEWING → rows; not ready → 409 |
| PATCH /rows/:rowId | CONFIRM with overrides → expense written; SKIP; invalid fields → 422 |
| POST /confirm-all | AUTO scope; ALL scope; returns correct count |

### Component Tests

- Stage transitions: upload accepted → Stage 2 renders, dropzone unmounted
- Polling: refetchInterval stops when status ≠ PARSING
- Inline editing: click yellow field → input focused; Tab → next uncertain field
- Optimistic rollback: PATCH fails → field reverts, toast shown
- Bulk confirm: calls useConfirmAll, invalidates expenses query

### E2E Playwright (`tests/e2e/ui/import.spec.ts`)

Six flows, serially (`--workers=1`), AI mocked via `AI_MOCK=true`:

1. **Happy path** — clean HDFC CSV, all auto-imported, expenses appear in list
2. **Mixed file** — partial review, inline edit, confirm individual + skip + confirm-all
3. **Malformed file** — FAILED status shown, user can re-upload
4. **Large file progress** — progress bar visibly advances before REVIEWING
5. **Page reload mid-review** — session survives refresh
6. **Empty file** — graceful rejection

Fixture files in `tests/e2e/fixtures/import/`. Cleanup hook deletes all import sessions for `DEMO_USER_ID` after each test.

**Not E2E:** format detection, confidence scoring, BatchQueue retries, API error codes, Tab order — all covered by lower layers.

---

## Section 8 — Implementation Plan (Agent/Skill Map)

### PHASE 1 — Foundation

**Step 1: DB Migration**
- Skill: `db-migration`
- Creates: `import_sessions`, `import_rows` + indexes
- Review: `superpowers:code-reviewer` after migration applied

**Step 2: Core server modules**
- Skill: `superpowers:test-driven-development` ← BEFORE writing any code

  **PARALLEL GROUP A** (skill: `superpowers:dispatching-parallel-agents`)

  | Task | Agent/Skill |
  |---|---|
  | A1: `server/queue/batch-queue.ts` | general-purpose agent |
  | A2: `server/import/bank-formats/` (all 6 formats) | general-purpose agent |
  | A3: `server/import/rule-classifier.ts` | general-purpose agent |

  Post-A1 review: `pr-review-toolkit:type-design-analyzer` (BatchQueue types)

- **Step 2b:** `server/queue/ai-classification-queue.ts`
  - Depends on: A1 complete
  - Review: `pr-review-toolkit:silent-failure-hunter` (AI call error paths)

- **Step 2c:** `server/import/import.service.ts`
  - Depends on: A2 + A3 + 2b complete

---

### PHASE 2 — API + Hooks

  **PARALLEL GROUP B** (skill: `superpowers:dispatching-parallel-agents`)

  | Task | Agent/Skill |
  |---|---|
  | B1: All 5 API routes | skill: `api-route` × 5 |
  | B2: All 4 React Query hooks | skill: `react-query-hook` |

  Post-B review:
  - `architecture-guardian` — verify layer ordering intact
  - `superpowers:code-reviewer` — API shape + hook patterns

---

### PHASE 3 — UI

  **PARALLEL GROUP C** (skill: `superpowers:dispatching-parallel-agents`)

  | Task | Agent/Skill |
  |---|---|
  | C1: ImportModal + 3 stage components + ReviewTable + ConfidenceIndicator | skill: `shadcn-component`, agent: `tailwind-shadcn-styler`, skill: `theme-guardian` (every component), skill: `frontend-design:frontend-design` (Motion animations) |
  | C2: ColumnMapper UI (GENERIC format) | skill: `shadcn-component`, agent: `tailwind-shadcn-styler` |

---

### PHASE 4 — Tests (parallel with Phase 3)

  **PARALLEL GROUP D** (skill: `superpowers:dispatching-parallel-agents`)

  | Task | Agent/Skill |
  |---|---|
  | D1: Unit tests (FileParser, RuleClassifier, BatchQueue, service) | agent: `test-writer` |
  | D2: API route tests | agent: `test-writer`, skill: `test-suite` |
  | D3: Component tests (modal stages, inline editing, optimistic) | agent: `test-writer` |

  **Step D4: E2E Playwright tests**
  - Depends on: C1 + D1 + D2 + D3 complete
  - Agent: `test-writer` (resume previous agent)
  - Skill: `test-endpoint` for verification

---

### PHASE 5 — Pre-PR Verification

| Action | Agent/Skill |
|---|---|
| Full test suite | agent: `test-caller` |
| Final layer audit | agent: `architecture-guardian` |
| Error handling audit | agent: `pr-review-toolkit:silent-failure-hunter` |
| Before "done" claim | skill: `superpowers:verification-before-completion` |
| Code review | skill: `superpowers:requesting-code-review` |
| Open PR | skill: `git-pr` |
