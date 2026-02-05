import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Drawer } from '@/components/ui/drawer'

describe('Modals / Drawer', () => {
  it('renders nothing when open is false', () => {
    renderWithProviders(
      <Drawer open={false} onOpenChange={vi.fn()}>
        <p>Drawer content</p>
      </Drawer>
    )
    expect(screen.queryByText('Drawer content')).not.toBeInTheDocument()
  })

  it('renders title and content when open', () => {
    renderWithProviders(
      <Drawer open={true} onOpenChange={vi.fn()} title="Test Drawer" description="Test description">
        <p>Drawer content</p>
      </Drawer>
    )
    expect(screen.getByText('Test Drawer')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Drawer content')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when close button is clicked', async () => {
    const onOpenChange = vi.fn()
    const { user } = renderWithProviders(
      <Drawer open={true} onOpenChange={onOpenChange} title="Test">
        <p>Content</p>
      </Drawer>
    )
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
