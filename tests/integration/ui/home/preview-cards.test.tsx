import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { ExpensesPreviewCard } from '@/components/common/ExpensesPreviewCard'
import { sampleExpense } from '@/tests/helpers/testData'
import { vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  expensesApi: {
    getExpenses: vi.fn(),
    getRecentExpenses: vi.fn(),
    createExpense: vi.fn(),
  },
  billsApi: { getBills: vi.fn() },
  billInstancesApi: { getBillInstances: vi.fn(), getUpcomingBills: vi.fn() },
  analyticsApi: { getAnalytics: vi.fn() },
  aiApi: { parseExpense: vi.fn() },
}))

describe('Home - Preview Cards', () => {
  it('ExpensesPreviewCard shows empty state when no expenses', async () => {
    const { expensesApi } = await import('@/lib/api')
    ;(expensesApi.getRecentExpenses as ReturnType<typeof vi.fn>).mockResolvedValue([])
    renderWithProviders(<ExpensesPreviewCard />)
    expect(await screen.findByText(/recent expenses/i)).toBeInTheDocument()
    expect(await screen.findByText(/0 transaction/i)).toBeInTheDocument()
  })

  it('ExpensesPreviewCard shows data when expenses exist', async () => {
    const { expensesApi } = await import('@/lib/api')
    const expense = { ...sampleExpense, amount: 100 }
    ;(expensesApi.getRecentExpenses as ReturnType<typeof vi.fn>).mockResolvedValue([expense])
    renderWithProviders(<ExpensesPreviewCard />)
    expect(await screen.findByText(/recent expenses/i)).toBeInTheDocument()
    expect(await screen.findByText(/1 transaction/)).toBeInTheDocument()
  })
})
