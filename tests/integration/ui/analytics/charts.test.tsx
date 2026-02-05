import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { SpendingTrendChart } from '@features/analytics/components/SpendingTrendChart'
import { mockSpendingTrendData } from '@/tests/helpers/testFixtures'

describe('Analytics - Charts', () => {
  it('renders spending trend chart container with data', () => {
    const { container } = renderWithProviders(<SpendingTrendChart data={mockSpendingTrendData} />)
    const chartEl = container.querySelector('[data-chart]')
    expect(chartEl).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    renderWithProviders(<SpendingTrendChart data={[]} />)
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument()
  })
})
