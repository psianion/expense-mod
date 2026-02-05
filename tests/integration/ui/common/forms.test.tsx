import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

describe('Forms', () => {
  it('renders button with text', () => {
    renderWithProviders(<Button>Submit</Button>)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('renders disabled button when disabled', () => {
    renderWithProviders(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })

  it('calls onClick when button is clicked', async () => {
    const onClick = vi.fn()
    const { user } = renderWithProviders(<Button onClick={onClick}>Click me</Button>)
    await user.click(screen.getByRole('button', { name: 'Click me' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders input with label', () => {
    renderWithProviders(
      <>
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" placeholder="0.00" />
      </>
    )
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })

  it('accepts input value', async () => {
    const { user } = renderWithProviders(<Input placeholder="Enter amount" />)
    const input = screen.getByPlaceholderText('Enter amount')
    await user.type(input, '99.50')
    expect(input).toHaveValue('99.50')
  })
})
