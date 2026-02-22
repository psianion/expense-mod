-- sql/migrations/006_import_sessions.sql

CREATE TABLE import_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NULL,
  status         text NOT NULL DEFAULT 'PARSING'
                 CHECK (status IN ('PARSING', 'REVIEWING', 'COMPLETE', 'FAILED')),
  source_file    text NOT NULL,
  bank_format    text NULL,
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
  raw_data          jsonb NOT NULL,
  amount            numeric(12,2),
  datetime          timestamptz,
  type              text,
  category          text,
  platform          text,
  payment_method    text,
  notes             text,
  tags              text[] DEFAULT '{}',
  recurring_flag    boolean DEFAULT false,
  confidence        jsonb NOT NULL DEFAULT '{}',
  classified_by     text NOT NULL DEFAULT 'RULE',
  posted_expense_id uuid NULL REFERENCES expenses(id),
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX import_rows_session_id_idx ON import_rows (session_id);
CREATE INDEX import_rows_status_idx ON import_rows (status);
