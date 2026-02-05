import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

describe('Settings - Income Management', () => {
  it('renders income tab', () => {
    renderWithProviders(
      <Tabs defaultValue="INCOME">
        <TabsList>
          <TabsTrigger value="INCOME">Income</TabsTrigger>
          <TabsTrigger value="BILLS">Bills</TabsTrigger>
        </TabsList>
        <TabsContent value="INCOME">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Salary" />
          <Button>Add income</Button>
        </TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tab', { name: 'Income' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add income' })).toBeInTheDocument()
  })
})
