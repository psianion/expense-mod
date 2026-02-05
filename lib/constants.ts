export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Personal Care',
  'Home & Garden',
  'Subscriptions',
  'Income',
  'Transfer',
  'Other'
] as const

export const DEFAULT_PLATFORMS = [
  'Swiggy',
  'Zomato',
  'Uber',
  'Ola',
  'Amazon',
  'Flipkart',
  'BigBasket',
  'Blinkit',
  'BookMyShow',
  'Netflix',
  'Other'
] as const

export const DEFAULT_PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Debit Card',
  'Credit Card',
  'Other'
] as const

// For Phase 2 - Credit Card Intelligence
export type CreditCard = {
  id: string
  name: string
  statement_day: number // 1-31
  payment_due_day: number // 1-31, specific day when payment is due
  color?: string
}
