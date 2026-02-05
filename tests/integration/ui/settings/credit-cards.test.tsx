import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { CreditCardManager } from '@features/settings/components/CreditCardManager'

describe('Settings - Credit Cards', () => {
  it('renders credit cards section', () => {
    renderWithProviders(<CreditCardManager />)
    expect(screen.getByRole('heading', { name: /your credit cards/i })).toBeInTheDocument()
  })
})
