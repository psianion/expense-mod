import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

describe('Bills - Add Instance', () => {
  it('drawer shows form when open', () => {
    renderWithProviders(
      <Drawer open={true} onOpenChange={vi.fn()} title="Add bill instance">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" placeholder="0" />
          <Button type="submit">Create</Button>
        </div>
      </Drawer>
    )
    expect(screen.getByText('Add bill instance')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})
