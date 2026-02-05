import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

describe('Expenses - Filters', () => {
  it('renders filter select', () => {
    renderWithProviders(
      <Select value="ALL" onValueChange={vi.fn()}>
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value="EXPENSE">Expense</SelectItem>
          <SelectItem value="INFLOW">Inflow</SelectItem>
        </SelectContent>
      </Select>
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
  })
})
