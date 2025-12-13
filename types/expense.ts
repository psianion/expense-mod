import type { BillInstance, BillMatchCandidate } from './bill'

export type ParsedExpense = {
  amount: number | null;
  currency: string | null;
  datetime: string | null;
  category: string | null;
  platform: string | null;
  payment_method: string | null;
  type: 'EXPENSE' | 'INFLOW';
  event: string | null;
  notes: string | null;
};

export type ExpenseSource = 'MANUAL' | 'AI' | 'RECURRING';
export type ExpenseType = 'EXPENSE' | 'INFLOW';
export type View = 'EXPENSES' | 'ANALYTICS' | 'BILLS' | 'SETTINGS';

export type Expense = {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  datetime: string;
  category: string | null;
  platform: string | null;
  payment_method: string | null;
  type: ExpenseType;
  event: string | null;
  notes: string | null;
  parsed_by_ai: boolean;
  raw_text: string | null;
  source: ExpenseSource;
  bill_instance_id: string | null;
  created_at: string;
  bill_instance?: BillInstance;
};

export type ParseExpenseRequest = {
  text: string;
};

export type ParseExpenseResponse = {
  parsed: ParsedExpense;
  raw_model_output: string;
  bill_match?: BillMatchCandidate | null;
};
