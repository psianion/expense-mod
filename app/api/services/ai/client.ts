import { OpenRouter } from '@openrouter/sdk'
import { expenseSchema, getExpenseParsingSystemPrompt, expenseParsingExamples } from './prompts'

// Initialize OpenRouter client
export const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Re-export prompts and schemas for convenience
export { expenseSchema, getExpenseParsingSystemPrompt, expenseParsingExamples }
