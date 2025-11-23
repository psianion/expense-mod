import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { ParseExpenseRequest, ParseExpenseResponse, ParsedExpense } from '../../types'
import { getCurrentDateTimeContext, parseAIDateTime } from '../../lib/datetime'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const getSystemPrompt = (currentDateTime: string) => `You are an assistant that extracts structured expense data from short free-text lines. 
Respond ONLY with valid JSON and nothing else.

IMPORTANT: ${currentDateTime}

When parsing dates:
- Relative dates like "yesterday", "today", "last week" should be calculated based on the current date/time above
- Return dates in ISO8601 format (YYYY-MM-DDTHH:mm:ss) representing the LOCAL time (not UTC)
- For relative dates, calculate from the current date/time provided above
- If no date is mentioned, return null for datetime

Keys:
- amount (number or null)
- currency (string, default "INR" if ambiguous)
- datetime (ISO8601 string in local time format YYYY-MM-DDTHH:mm:ss, or null)
- category (string or null)
- platform (string or null)
- payment_method (string or null)
- type ("expense" or "inflow")
- event (string or null)
- notes (string or null)
If value unknown, return null. Normalize merchant/platform names (e.g., "swiggy" -> "Swiggy").`

const examples = [
  {
    role: 'user' as const,
    content: '20 rupees chips Swiggy Kerala trip by card'
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 20,
      currency: "INR",
      datetime: null,
      category: "Food",
      platform: "Swiggy",
      payment_method: "Card",
      type: "expense",
      event: "Kerala trip",
      notes: "chips"
    })
  },
  {
    role: 'user' as const,
    content: 'Hotel booking 2500 INR Mumbai 15th Dec'
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 2500,
      currency: "INR",
      datetime: "2024-12-15T00:00:00",
      category: "Accommodation",
      platform: null,
      payment_method: null,
      type: "expense",
      event: null,
      notes: "Hotel booking Mumbai"
    })
  },
  {
    role: 'user' as const,
    content: 'Coffee 50 yesterday morning'
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 50,
      currency: "INR",
      datetime: null, // Will be calculated based on current date
      category: "Food",
      platform: null,
      payment_method: null,
      type: "expense",
      event: null,
      notes: "Coffee yesterday morning"
    })
  },
  {
    role: 'user' as const,
    content: 'Got salary 50000 UPI transfer'
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 50000,
      currency: "INR",
      datetime: null,
      category: "Income",
      platform: null,
      payment_method: "UPI",
      type: "inflow",
      event: null,
      notes: "salary"
    })
  },
  {
    role: 'user' as const,
    content: 'Refund 1500 Amazon order cancelled'
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 1500,
      currency: "INR",
      datetime: null,
      category: "Refund",
      platform: "Amazon",
      payment_method: null,
      type: "inflow",
      event: null,
      notes: "order cancelled"
    })
  },
  {
    role: 'user' as const,
    content: 'Coffee 120 cash Starbucks'
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 120,
      currency: "INR",
      datetime: null,
      category: "Food",
      platform: "Starbucks",
      payment_method: "Cash",
      type: "expense",
      event: null,
      notes: "Coffee"
    })
  },
  {
    role: 'user' as const,
    content: 'Metro card recharge 500'
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 500,
      currency: "INR",
      datetime: null,
      category: "Transport",
      platform: null,
      payment_method: null,
      type: "expense",
      event: null,
      notes: "Metro card recharge"
    })
  }
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParseExpenseResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text }: ParseExpenseRequest = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    // Get current date/time context for the AI prompt
    const currentDateTime = getCurrentDateTimeContext()
    const systemPrompt = getSystemPrompt(currentDateTime)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...examples,
      { role: 'user' as const, content: text }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.0,
      max_tokens: 500,
    })

    const rawModelOutput = completion.choices[0]?.message?.content || ''

    // Parse the JSON response
    let parsed: ParsedExpense
    try {
      parsed = JSON.parse(rawModelOutput)
    } catch (parseError) {
      // Fallback heuristics if JSON parsing fails
      const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
      parsed = {
        amount: amountMatch ? parseFloat(amountMatch[1]) : null,
        currency: 'INR',
        datetime: null,
        category: null,
        platform: null,
        payment_method: null,
        type: 'expense',
        event: null,
        notes: text
      }
    }

    // Apply fallback heuristics
    if (!parsed.amount) {
      const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
      if (amountMatch) {
        parsed.amount = parseFloat(amountMatch[1])
      }
    }

    if (!parsed.currency) {
      parsed.currency = 'INR'
    }

    if (!parsed.type) {
      parsed.type = 'expense'
    }

    // Post-process datetime: convert AI response to proper local time format
    // Handle relative dates like "yesterday" by parsing the text directly
    if (!parsed.datetime) {
      // Try to extract relative dates from the text
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
      // Parse and normalize the AI-returned datetime
      parsed.datetime = parseAIDateTime(parsed.datetime, new Date())
    }

    return res.status(200).json({
      parsed,
      raw_model_output: rawModelOutput
    })

  } catch (error) {
    console.error('OpenAI API error:', error)
    return res.status(500).json({ error: 'Failed to parse expense' })
  }
}
