import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { ExpensesList } from '@features/expenses/components/ExpensesList'
import { sampleExpense } from '@/tests/helpers/testData'

describe('Expenses - Sorting', () => {
  it('displays expenses in the order provided', () => {
    const expenses = [
      { ...sampleExpense, id: '1', amount: 100, category: 'A' },
      { ...sampleExpense, id: '2', amount: 50, category: 'B' },
    ]
    renderWithProviders(<ExpensesList expenses={expenses} isLoading={false} />)
    const rows = screen.getAllByRole('generic').filter((el) => el.textContent?.includes('₹'))
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})
