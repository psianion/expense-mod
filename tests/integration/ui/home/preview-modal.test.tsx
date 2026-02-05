import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { PreviewModal } from '@features/expenses/components/PreviewModal'
import { mockExpensePreview } from '@/tests/helpers/testFixtures'

describe('Home - Preview Modal', () => {
  it('renders nothing when open is false', () => {
    renderWithProviders(
      <PreviewModal
        open={false}
        onOpenChange={vi.fn()}
        parsedExpense={mockExpensePreview}
        onSave={vi.fn()}
        isLoading={false}
      />
    )
    expect(screen.queryByText('Preview & Edit Expense')).not.toBeInTheDocument()
  })

  it('renders title and amount when open with parsed expense', () => {
    renderWithProviders(
      <PreviewModal
        open={true}
        onOpenChange={vi.fn()}
        parsedExpense={mockExpensePreview}
        onSave={vi.fn()}
        isLoading={false}
      />
    )
    expect(screen.getByText('Preview & Edit Expense')).toBeInTheDocument()
    expect(screen.getByDisplayValue('42.5')).toBeInTheDocument()
  })

  it('calls onSave when Save button is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <PreviewModal
        open={true}
        onOpenChange={vi.fn()}
        parsedExpense={mockExpensePreview}
        onSave={onSave}
        isLoading={false}
      />
    )
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    expect(onSave).toHaveBeenCalled()
  })
})
