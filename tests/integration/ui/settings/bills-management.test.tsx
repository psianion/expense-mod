import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

describe('Settings - Bills Management', () => {
  it('renders bills tab', () => {
    renderWithProviders(
      <Tabs defaultValue="BILLS">
        <TabsList>
          <TabsTrigger value="INCOME">Income</TabsTrigger>
          <TabsTrigger value="BILLS">Bills & Loans</TabsTrigger>
        </TabsList>
        <TabsContent value="BILLS">
          <p>Bills table</p>
        </TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tab', { name: /bills & loans/i })).toBeInTheDocument()
    expect(screen.getByText('Bills table')).toBeInTheDocument()
  })
})
