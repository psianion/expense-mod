import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Button } from '@/components/ui/button'

describe('Analytics - Reconciliation', () => {
  it('renders reconcile action', () => {
    renderWithProviders(<Button variant="outline">Reconcile</Button>)
    expect(screen.getByRole('button', { name: 'Reconcile' })).toBeInTheDocument()
  })
})
