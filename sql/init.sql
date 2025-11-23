-- Enable UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Expenses table (auth-ready)
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL, -- for future auth
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'INR',
  datetime timestamptz DEFAULT now(),
  category text,
  platform text,
  payment_method text,
  type text DEFAULT 'expense', -- 'expense' or 'inflow'
  event text,
  notes text,
  parsed_by_ai boolean DEFAULT false,
  raw_text text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON expenses (created_at DESC);

-- TODO (future): Enable RLS once auth is added
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "user_can_read_own" ON expenses FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "user_can_insert_own" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "user_can_update_own" ON expenses FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "user_can_delete_own" ON expenses FOR DELETE USING (auth.uid() = user_id);
