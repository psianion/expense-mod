import { OpenRouter } from '@openrouter/sdk'
import { expenseSchema } from '../expense-parser/schema'
import { getExpenseParsingSystemPrompt, expenseParsingExamples } from '../expense-parser/prompts'

// Initialize OpenRouter client
export const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Re-export prompts and schemas for convenience
export { expenseSchema, getExpenseParsingSystemPrompt, expenseParsingExamples }
