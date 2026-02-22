// server/import/rule-classifier.ts
import type { RawImportRow, ClassifiedRow, ConfidenceScores } from '@/types/import'

// Keyword → { category, confidence }
const CATEGORY_RULES: Array<{ keywords: string[]; category: string; confidence: number }> = [
  { keywords: ['zomato', 'swiggy', 'uber eats', 'blinkit', 'zepto', 'dunzo', 'bigbasket', 'restaurant', 'food', 'cafe', 'dhaba'], category: 'Food', confidence: 0.9 },
  { keywords: ['netflix', 'spotify', 'hotstar', 'prime video', 'youtube premium', 'disney', 'subscription', 'ott'], category: 'Entertainment', confidence: 0.92 },
  { keywords: ['uber', 'ola', 'rapido', 'metro', 'bus', 'railway', 'irctc', 'petrol', 'diesel', 'fuel'], category: 'Transport', confidence: 0.9 },
  { keywords: ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa', 'shopping', 'mall'], category: 'Shopping', confidence: 0.88 },
  { keywords: ['makemytrip', 'goibibo', 'yatra', 'oyo', 'hotel', 'airbnb', 'flight', 'airline'], category: 'Travel', confidence: 0.88 },
  { keywords: ['apollo', 'hospital', 'pharmacy', 'medical', 'doctor', 'clinic', 'health', 'medplus', 'netmeds'], category: 'Health', confidence: 0.85 },
  { keywords: ['electricity', 'eb bill', 'bescom', 'msedcl', 'tata power', 'power', 'water bill', 'gas bill', 'bsnl', 'airtel', 'jio', 'wifi', 'broadband', 'internet'], category: 'Utilities', confidence: 0.9 },
  { keywords: ['rent', 'rental', 'flat', 'apartment', 'house rent', 'pg'], category: 'Rent', confidence: 0.92 },
  { keywords: ['salary', 'payroll', 'pay credit', 'stipend'], category: 'Salary', confidence: 0.95 },
  { keywords: ['emi', 'loan', 'installment', 'home loan', 'car loan'], category: 'EMI', confidence: 0.9 },
  { keywords: ['insurance', 'lic', 'premium', 'policy'], category: 'Insurance', confidence: 0.88 },
  { keywords: ['school', 'college', 'university', 'tuition', 'course', 'udemy', 'coursera'], category: 'Education', confidence: 0.87 },
]

const PAYMENT_RULES: Array<{ keywords: string[]; method: string }> = [
  { keywords: ['upi', '@'], method: 'UPI' },
  { keywords: ['neft', 'rtgs', 'imps', 'bank transfer'], method: 'Bank Transfer' },
  { keywords: ['atm', 'cash withdrawal'], method: 'Cash' },
  { keywords: ['credit card', 'cc payment', 'creditcard'], method: 'Credit Card' },
  { keywords: ['debit card'], method: 'Debit Card' },
]

function classifyCategory(narration: string): { category: string | null; confidence: number } {
  const lower = narration.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { category: rule.category, confidence: rule.confidence }
    }
  }
  return { category: null, confidence: 0 }
}

function classifyPaymentMethod(narration: string): { method: string | null; confidence: number } {
  const lower = narration.toLowerCase()
  for (const rule of PAYMENT_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { method: rule.method, confidence: 1.0 }
    }
  }
  return { method: null, confidence: 0 }
}

function extractMerchantKey(narration: string): string {
  // Coarse merchant fingerprint for recurring detection
  const lower = narration.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
  const words = lower.split(/\s+/).filter(w => w.length > 3)
  return words.slice(0, 1).join(' ')
}

export function classifyRows(rows: RawImportRow[]): ClassifiedRow[] {
  // Count merchant appearances for recurring detection
  const merchantCounts: Record<string, number> = {}
  for (const row of rows) {
    const key = extractMerchantKey(row.narration)
    if (key) merchantCounts[key] = (merchantCounts[key] || 0) + 1
  }

  return rows.map(row => {
    const { category, confidence: catConf } = classifyCategory(row.narration)
    const { method: payment_method, confidence: pmConf } = classifyPaymentMethod(row.narration)

    const merchantKey = extractMerchantKey(row.narration)
    const recurring_flag = (merchantCounts[merchantKey] ?? 0) >= 2

    const confidence: ConfidenceScores = {
      amount: row.amount !== null ? 1.0 : 0,
      datetime: row.datetime !== null ? 0.95 : 0,
      type: row.type !== null ? 1.0 : 0,
      category: catConf,
      platform: catConf > 0 ? 0.8 : 0,
      payment_method: pmConf,
    }

    // Platform: capitalize first meaningful word from narration if category known
    const platform = catConf > 0
      ? narrationToMerchantName(row.narration)
      : null

    return {
      ...row,
      category,
      platform,
      payment_method,
      notes: null,
      tags: [],
      recurring_flag,
      confidence,
      classified_by: 'RULE' as const,
    }
  })
}

function narrationToMerchantName(narration: string): string | null {
  const first = narration.split(/[\s/|]/)[0]
  if (!first || first.length < 2) return null
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}
