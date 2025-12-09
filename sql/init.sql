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
  type text DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'INFLOW')), -- 'EXPENSE' or 'INFLOW'
  event text,
  notes text,
  parsed_by_ai boolean DEFAULT false,
  raw_text text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON expenses (created_at DESC);

-- Bills / recurring templates
CREATE TABLE bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION', 'SALARY', 'INCOME')),
  frequency text NOT NULL CHECK (frequency IN ('MONTHLY', 'WEEKLY', 'YEARLY')),
  day_of_month smallint NULL,
  day_of_week smallint NULL,
  start_date date DEFAULT CURRENT_DATE,
  end_date date NULL,
  amount numeric(12,2) NULL,
  is_variable boolean DEFAULT false,
  auto_post boolean DEFAULT false,
  notes text NULL,
  last_generated_at timestamptz NULL,
  last_bill_created timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bills_day_of_month_valid CHECK (
    frequency <> 'MONTHLY' OR (day_of_month BETWEEN 1 AND 28)
  ),
  CONSTRAINT bills_day_of_week_valid CHECK (
    frequency <> 'WEEKLY' OR (day_of_week BETWEEN 0 AND 6)
  )
);

CREATE INDEX bills_type_idx ON bills (type);
CREATE INDEX bills_frequency_idx ON bills (frequency);
CREATE INDEX bills_start_date_idx ON bills (start_date);
CREATE INDEX bills_end_date_idx ON bills (end_date);

-- Concrete bill instances (pending / posted / skipped)
CREATE TABLE bill_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id uuid NULL,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'POSTED', 'SKIPPED')),
  posted_expense_id uuid NULL REFERENCES expenses(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX bill_instances_bill_id_idx ON bill_instances (bill_id);
CREATE INDEX bill_instances_due_date_idx ON bill_instances (due_date);
CREATE INDEX bill_instances_status_idx ON bill_instances (status);

-- Trace expenses that came from AI or recurring flows
ALTER TABLE expenses
  ADD COLUMN source text NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI', 'RECURRING')),
  ADD COLUMN bill_instance_id uuid NULL REFERENCES bill_instances(id);

CREATE INDEX expenses_source_idx ON expenses (source);
CREATE INDEX expenses_bill_instance_id_idx ON expenses (bill_instance_id);

-- TODO (future): Enable RLS once auth is added
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "user_can_read_own" ON expenses FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "user_can_insert_own" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "user_can_update_own" ON expenses FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "user_can_delete_own" ON expenses FOR DELETE USING (auth.uid() = user_id);
