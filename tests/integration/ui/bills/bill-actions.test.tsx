import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Button } from '@/components/ui/button'

describe('Bills - Actions', () => {
  it('renders action buttons', async () => {
    const onMarkPaid = vi.fn()
    const onSkip = vi.fn()
    const { user } = renderWithProviders(
      <>
        <Button onClick={onMarkPaid}>Mark paid</Button>
        <Button variant="outline" onClick={onSkip}>Skip</Button>
      </>
    )
    await user.click(screen.getByRole('button', { name: /mark paid/i }))
    expect(onMarkPaid).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })
})
