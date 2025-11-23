export type ParsedExpense = {
  amount: number | null;
  currency: string | null;
  datetime: string | null;
  category: string | null;
  platform: string | null;
  payment_method: string | null;
  type: 'expense' | 'inflow';
  event: string | null;
  notes: string | null;
};

export type Expense = {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  datetime: string;
  category: string | null;
  platform: string | null;
  payment_method: string | null;
  type: 'expense' | 'inflow';
  event: string | null;
  notes: string | null;
  parsed_by_ai: boolean;
  raw_text: string | null;
  created_at: string;
};

export type ParseExpenseRequest = {
  text: string;
};

export type ParseExpenseResponse = {
  parsed: ParsedExpense;
  raw_model_output: string;
};
