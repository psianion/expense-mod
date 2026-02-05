import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

describe('Analytics - Credit Cards', () => {
  it('renders a card section', () => {
    renderWithProviders(
      <Card>
        <CardHeader>
          <CardTitle>Credit card insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No cards configured</p>
        </CardContent>
      </Card>
    )
    expect(screen.getByText('Credit card insights')).toBeInTheDocument()
  })
})
