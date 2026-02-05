/**
 * Test database setup/teardown for E2E tests using a real Supabase instance.
 * Use env.test (from env.test.example) for test Supabase URL and key.
 */

export async function setupTestDatabase(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Test database requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (e.g. from env.test)'
    )
  }
  // Optional: run schema migrations or seed data here
  // For now, E2E tests assume schema already exists; add seed/teardown if needed.
}

export async function teardownTestDatabase(): Promise<void> {
  // Optional: truncate test tables or reset state
}

export async function seedTestData(): Promise<void> {
  // Optional: insert minimal test data for E2E
}
