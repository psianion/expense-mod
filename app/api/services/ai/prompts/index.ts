/**
 * AI Prompts and Schemas
 *
 * Naming Convention:
 * - {feature}-{purpose}.ts (e.g., expense-parsing.ts, expense-schema.ts)
 * - Use kebab-case for multi-word names
 * - Group related functionality by feature/domain
 * - Be descriptive but concise
 *
 * Examples:
 * - expense-schema.ts (JSON schemas for expense parsing)
 * - expense-parsing.ts (prompts and examples for expense parsing)
 * - transaction-categorization.ts (future: categorization prompts)
 * - receipt-analysis.ts (future: receipt processing prompts)
 */

// Prompts and schemas exports
export { expenseSchema } from './expense-schema'
export { getExpenseParsingSystemPrompt, expenseParsingExamples } from './expense-parsing'
