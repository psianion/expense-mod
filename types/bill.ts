export type BillType = 'BILL' | 'EMI' | 'CREDITCARD' | 'SUBSCRIPTION' | 'SALARY' | 'INCOME';
export type BillFrequency = 'MONTHLY' | 'WEEKLY' | 'YEARLY';

export type Bill = {
  id: string;
  user_id: string | null;
  name: string;
  type: BillType;
  frequency: BillFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string | null;
  end_date: string | null;
  amount: number | null;
  auto_post: boolean;
  notes: string | null;
  last_generated_at: string | null;
  last_bill_created: string | null;
  created_at: string;
  updated_at: string;
};

export type BillInstanceStatus = 'DUE' | 'PAID' | 'SKIPPED';

export type BillInstance = {
  id: string;
  bill_id: string;
  user_id: string | null;
  due_date: string;
  amount: number;
  status: BillInstanceStatus;
  posted_expense_id: string | null;
  created_at: string;
  bill?: Bill;
};

export type BillMatchCandidate = {
  bill_id?: string;
  bill_name?: string;
  bill_type?: BillType;
};


