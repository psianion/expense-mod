import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { ExpensesList } from '@features/expenses/components/ExpensesList'
import { sampleExpense } from '@/tests/helpers/testData'

describe('Expenses - Table', () => {
  it('shows loading state', () => {
    renderWithProviders(<ExpensesList expenses={[]} isLoading={true} />)
    expect(screen.getByText('Loading expenses...')).toBeInTheDocument()
  })

  it('shows empty state when no expenses', () => {
    renderWithProviders(<ExpensesList expenses={[]} isLoading={false} />)
    expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument()
  })

  it('renders expense rows when data provided', () => {
    const expenses = [
      { ...sampleExpense, id: '1', amount: 50, category: 'Food' },
      { ...sampleExpense, id: '2', amount: 100, category: 'Transport' },
    ]
    renderWithProviders(<ExpensesList expenses={expenses} isLoading={false} />)
    expect(screen.getByText('2 expenses found')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
  })
})
