// types/import.ts

export type BankFormatId = 'HDFC' | 'ICICI' | 'AXIS' | 'SBI' | 'KOTAK' | 'GENERIC'
export type ImportSessionStatus = 'PARSING' | 'REVIEWING' | 'COMPLETE' | 'FAILED'
export type ImportRowStatus = 'PENDING' | 'CONFIRMED' | 'SKIPPED'
export type ClassifiedBy = 'RULE' | 'AI' | 'MANUAL'

// Raw normalized row from FileParser before classification
export interface RawImportRow {
  raw_data: Record<string, string>  // original CSV row preserved
  amount: number | null
  datetime: string | null           // ISO8601
  type: 'EXPENSE' | 'INFLOW' | null
  narration: string                 // raw description from bank
}

// Per-field confidence scores (0.0–1.0)
export interface ConfidenceScores {
  amount?: number
  datetime?: number
  type?: number
  category?: number
  platform?: number
  payment_method?: number
}

// Fully classified row (output of RuleClassifier / AIClassifier)
export interface ClassifiedRow extends RawImportRow {
  category: string | null
  platform: string | null
  payment_method: string | null
  notes: string | null
  tags: string[]
  recurring_flag: boolean
  confidence: ConfidenceScores
  classified_by: ClassifiedBy
}

// DB shape of import_sessions
export interface ImportSession {
  id: string
  user_id: string | null
  status: ImportSessionStatus
  source_file: string
  bank_format: BankFormatId | null
  row_count: number
  auto_count: number
  review_count: number
  progress_done: number
  progress_total: number
  expires_at: string
  created_at: string
}

// Input types for import actions (also inferred by Zod schemas in server/validators/import.schema.ts)
export interface ConfirmRowInput {
  action: 'CONFIRM' | 'SKIP'
  fields?: {
    amount?: number
    datetime?: string
    type?: 'EXPENSE' | 'INFLOW'
    category?: string
    platform?: string
    payment_method?: string
    notes?: string
    tags?: string[]
  }
}

export interface ConfirmAllInput {
  scope: 'AUTO' | 'ALL'
}

// DB shape of import_rows
export interface ImportRow {
  id: string
  session_id: string
  status: ImportRowStatus
  raw_data: Record<string, string>
  amount: number | null
  datetime: string | null
  type: 'EXPENSE' | 'INFLOW' | null
  category: string | null
  platform: string | null
  payment_method: string | null
  notes: string | null
  tags: string[]
  recurring_flag: boolean
  confidence: ConfidenceScores
  classified_by: ClassifiedBy
  posted_expense_id: string | null
  created_at: string
}
