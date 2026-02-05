import type { CreditCard } from './constants'

/**
 * Represents a credit card statement period
 */
export interface StatementPeriod {
  periodStart: Date
  periodEnd: Date
  statementDate: Date
  dueDate: Date
  cardName: string
}

/**
 * Calculate which statement period contains a given expense date
 *
 * @param expenseDate - The date of the expense
 * @param card - The credit card configuration
 * @returns StatementPeriod containing the expense
 */
export function calculateStatementPeriod(expenseDate: Date, card: CreditCard): StatementPeriod {
  const { statement_day, payment_due_day } = card

  // Create a copy of the expense date to avoid mutating the original
  const expenseDateCopy = new Date(expenseDate)

  // Find the most recent statement date before or on the expense date
  const statementDate = findPreviousStatementDate(expenseDateCopy, statement_day)

  // Calculate period start (day after previous statement)
  const periodStart = new Date(statementDate)
  periodStart.setDate(statementDate.getDate() + 1)

  // Calculate period end (the statement date itself)
  const periodEnd = new Date(statementDate)

  // Calculate due date (the specific due day after the statement date)
  const dueDate = findNextDueDate(statementDate, payment_due_day)

  return {
    periodStart,
    periodEnd,
    statementDate,
    dueDate,
    cardName: card.name
  }
}

/**
 * Find the most recent statement date on or before the given date
 *
 * @param referenceDate - The reference date
 * @param statementDay - Day of month when statements are generated (1-31)
 * @returns The most recent statement date
 */
function findPreviousStatementDate(referenceDate: Date, statementDay: number): Date {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const day = referenceDate.getDate()

  // Try current month first
  if (day >= statementDay) {
    // Statement has been generated this month
    return new Date(year, month, statementDay)
  } else {
    // Statement was generated last month
    const lastMonth = month === 0 ? 11 : month - 1
    const lastMonthYear = month === 0 ? year - 1 : year

    // Get the last day of last month to handle cases where statementDay > lastMonthDays
    const lastMonthDays = new Date(lastMonthYear, lastMonth + 1, 0).getDate()
    const actualStatementDay = Math.min(statementDay, lastMonthDays)

    return new Date(lastMonthYear, lastMonth, actualStatementDay)
  }
}

/**
 * Find the next due date for a credit card payment
 *
 * @param statementDate - The statement date
 * @param dueDay - Day of month when payment is due (1-31)
 * @returns The next due date after the statement date
 */
function findNextDueDate(statementDate: Date, dueDay: number): Date {
  const statementYear = statementDate.getFullYear()
  const statementMonth = statementDate.getMonth()

  // Try the same month as statement date first
  if (dueDay >= statementDate.getDate()) {
    // Due date is on or after statement date in the same month
    const sameMonthDueDate = new Date(statementYear, statementMonth, dueDay)

    // Handle case where due day doesn't exist in this month (e.g., Feb 30)
    if (sameMonthDueDate.getDate() === dueDay) {
      return sameMonthDueDate
    }
  }

  // Due date is in the next month
  const nextMonth = statementMonth === 11 ? 0 : statementMonth + 1
  const nextMonthYear = statementMonth === 11 ? statementYear + 1 : statementYear

  // Get the last day of the next month to handle cases where dueDay > lastMonthDays
  const nextMonthLastDay = new Date(nextMonthYear, nextMonth + 1, 0).getDate()
  const actualDueDay = Math.min(dueDay, nextMonthLastDay)

  return new Date(nextMonthYear, nextMonth, actualDueDay)
}

/**
 * Get the current statement period for a credit card
 *
 * @param card - The credit card configuration
 * @returns Current statement period
 */
export function getCurrentStatementPeriod(card: CreditCard): StatementPeriod {
  const now = new Date()
  return calculateStatementPeriod(now, card)
}

/**
 * Get the next statement period for a credit card
 *
 * @param card - The credit card configuration
 * @returns Next statement period
 */
export function getNextStatementPeriod(card: CreditCard): StatementPeriod {
  const currentPeriod = getCurrentStatementPeriod(card)
  const nextStatementDate = new Date(currentPeriod.statementDate)
  nextStatementDate.setMonth(nextStatementDate.getMonth() + 1)

  // Adjust for month overflow (e.g., Jan 31 -> Feb 28/29)
  const nextMonthDays = new Date(nextStatementDate.getFullYear(), nextStatementDate.getMonth() + 1, 0).getDate()
  const actualStatementDay = Math.min(card.statement_day, nextMonthDays)
  nextStatementDate.setDate(actualStatementDay)

  return calculateStatementPeriod(nextStatementDate, card)
}

/**
 * Check if an expense date falls within a statement period
 *
 * @param expenseDate - The expense date
 * @param period - The statement period
 * @returns True if expense is in the period
 */
export function isExpenseInPeriod(expenseDate: Date, period: StatementPeriod): boolean {
  const expenseTime = expenseDate.getTime()
  return expenseTime >= period.periodStart.getTime() && expenseTime <= period.periodEnd.getTime()
}

/**
 * Format a statement period for display
 *
 * @param period - The statement period
 * @returns Formatted string like "Dec 5 - Jan 4, 2024"
 */
export function formatStatementPeriod(period: StatementPeriod): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return `${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`
}

/**
 * Get all expenses that belong to a specific statement period
 * This is a helper function that would be used in analytics
 *
 * @param expenses - Array of expenses
 * @param period - The statement period
 * @returns Filtered expenses for the period
 */
export function filterExpensesByPeriod(expenses: any[], period: StatementPeriod): any[] {
  return expenses.filter(expense => {
    if (!expense.datetime) return false
    const expenseDate = new Date(expense.datetime)
    return isExpenseInPeriod(expenseDate, period)
  })
}
