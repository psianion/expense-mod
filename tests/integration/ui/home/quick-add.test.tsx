import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { QuickAdd } from '@features/expenses/components/QuickAdd'

describe('Home - Quick Add', () => {
  it('renders title and textarea', () => {
    const onParse = vi.fn()
    renderWithProviders(<QuickAdd onParse={onParse} isLoading={false} />)
    expect(screen.getByText('Quick Add Expense')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/20 rupees chips Swiggy/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /parse & preview/i })).toBeInTheDocument()
  })

  it('submit button is disabled when text is empty', () => {
    renderWithProviders(<QuickAdd onParse={vi.fn()} isLoading={false} />)
    expect(screen.getByRole('button', { name: /parse & preview/i })).toBeDisabled()
  })

  it('calls onParse when form is submitted with text', async () => {
    const onParse = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(<QuickAdd onParse={onParse} isLoading={false} />)
    const textarea = screen.getByPlaceholderText(/20 rupees chips Swiggy/)
    await user.type(textarea, 'Coffee $5')
    await user.click(screen.getByRole('button', { name: /parse & preview/i }))
    expect(onParse).toHaveBeenCalledWith('Coffee $5')
  })

  it('shows loading state when isLoading is true', () => {
    renderWithProviders(<QuickAdd onParse={vi.fn()} isLoading={true} />)
    expect(screen.getByRole('button', { name: /parsing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /parsing/i })).toBeDisabled()
  })
})
