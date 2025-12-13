import { ParsedExpense } from '../../../types'
import { parseAIDateTime } from '../../../lib/datetime'

export function postProcessParsedExpense(text: string, rawModelOutput: string): ParsedExpense {
  let parsed: ParsedExpense
  try {
    parsed = JSON.parse(rawModelOutput)
  } catch (parseError) {
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
    parsed = {
      amount: amountMatch ? parseFloat(amountMatch[1]) : null,
      currency: 'INR',
      datetime: null,
      category: null,
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: text,
    }
  }

  if (!parsed.amount) {
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (amountMatch) {
      parsed.amount = parseFloat(amountMatch[1])
    }
  }

  if (!parsed.currency) {
    parsed.currency = 'INR'
  }

  parsed.type = (parsed.type || 'EXPENSE').toString().toUpperCase() as ParsedExpense['type']

  if (!parsed.datetime) {
    const lowerText = text.toLowerCase()
    const now = new Date()

    if (lowerText.includes('yesterday')) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      parsed.datetime = parseAIDateTime(null, yesterday)
    } else if (lowerText.includes('today') || lowerText.includes('this morning') || lowerText.includes('this afternoon')) {
      parsed.datetime = parseAIDateTime(null, now)
    } else if (lowerText.includes('last week')) {
      const lastWeek = new Date(now)
      lastWeek.setDate(lastWeek.getDate() - 7)
      parsed.datetime = parseAIDateTime(null, lastWeek)
    }
  } else {
    parsed.datetime = parseAIDateTime(parsed.datetime, new Date())
  }

  return parsed
}
