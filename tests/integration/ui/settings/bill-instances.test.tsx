import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

describe('Settings - Bill Instances Tab', () => {
  it('renders bill instances tab', () => {
    renderWithProviders(
      <Tabs defaultValue="INSTANCES">
        <TabsList>
          <TabsTrigger value="INSTANCES">Bill instances</TabsTrigger>
        </TabsList>
        <TabsContent value="INSTANCES">
          <Badge>DUE</Badge>
        </TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tab', { name: /bill instances/i })).toBeInTheDocument()
    expect(screen.getByText('DUE')).toBeInTheDocument()
  })
})
