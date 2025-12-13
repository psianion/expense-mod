// Prompts and examples for expense parsing

export const getExpenseParsingSystemPrompt = (currentDateTime: string) => `You are an assistant that extracts structured expense data from short free-text lines.

IMPORTANT: ${currentDateTime}

When parsing dates:
- Relative dates like "yesterday", "today", "last week" should be calculated based on the current date/time above
- Return dates in ISO8601 format (YYYY-MM-DDTHH:mm:ss) representing the LOCAL time (not UTC)
- For relative dates, calculate from the current date/time provided above
- If no date is mentioned, return null for datetime

Normalize merchant/platform names (e.g., "swiggy" -> "Swiggy").`

export const expenseParsingExamples = [
  {
    role: 'user' as const,
    content: '20 rupees chips Swiggy Kerala trip by card',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 20,
      currency: 'INR',
      datetime: null,
      category: 'Food',
      platform: 'Swiggy',
      payment_method: 'Card',
      type: 'EXPENSE',
      event: 'Kerala trip',
      notes: 'chips',
    }),
  },
  {
    role: 'user' as const,
    content: 'Hotel booking 2500 INR Mumbai 15th Dec',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 2500,
      currency: 'INR',
      datetime: '2024-12-15T00:00:00',
      category: 'Accommodation',
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: 'Hotel booking Mumbai',
    }),
  },
  {
    role: 'user' as const,
    content: 'Coffee 50 yesterday morning',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 50,
      currency: 'INR',
      datetime: null, // Will be calculated based on current date
      category: 'Food',
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: 'Coffee yesterday morning',
    }),
  },
  {
    role: 'user' as const,
    content: 'Got salary 50000 UPI transfer',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 50000,
      currency: 'INR',
      datetime: null,
      category: 'Income',
      platform: null,
      payment_method: 'UPI',
      type: 'INFLOW',
      event: null,
      notes: 'salary',
    }),
  },
  {
    role: 'user' as const,
    content: 'Refund 1500 Amazon order cancelled',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 1500,
      currency: 'INR',
      datetime: null,
      category: 'Refund',
      platform: 'Amazon',
      payment_method: null,
      type: 'INFLOW',
      event: null,
      notes: 'order cancelled',
    }),
  },
  {
    role: 'user' as const,
    content: 'Coffee 120 cash Starbucks',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 120,
      currency: 'INR',
      datetime: null,
      category: 'Food',
      platform: 'Starbucks',
      payment_method: 'Cash',
      type: 'EXPENSE',
      event: null,
      notes: 'Coffee',
    }),
  },
  {
    role: 'user' as const,
    content: 'Metro card recharge 500',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 500,
      currency: 'INR',
      datetime: null,
      category: 'Transport',
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: 'Metro card recharge',
    }),
  },
]
