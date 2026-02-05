import type { BillInstance, BillMatchCandidate } from './bill'

export type ParsedExpense = {
  amount: number | null;
  datetime: string | null;
  category: string; // Default to 'Other'
  platform: string; // Default to 'Other'
  payment_method: string; // Default to 'Other'
  type: 'EXPENSE' | 'INFLOW';
  tags: string[]; // Convert event/notes to tags
};

export type ExpenseSource = 'MANUAL' | 'AI' | 'RECURRING';
export type ExpenseType = 'EXPENSE' | 'INFLOW';
export type View = 'EXPENSES' | 'ANALYTICS' | 'BILLS' | 'SETTINGS';

export type Expense = {
  id: string;
  user_id: string | null;
  amount: number;
  datetime: string; // Required
  category: string; // Required (default: 'Other')
  platform: string; // Required (default: 'Other')
  payment_method: string; // Required (default: 'Other')
  type: ExpenseType;
  tags: string[]; // Replace event + notes
  parsed_by_ai: boolean;
  raw_text: string | null;
  source: ExpenseSource;
  bill_id: string | null; // For Phase 2 credit card linkage
  created_at: string;
};

export type ParseExpenseRequest = {
  text: string;
};

export type ParseExpenseResponse = {
  parsed: ParsedExpense;
  raw_model_output: string;
  bill_match?: BillMatchCandidate | null;
};
