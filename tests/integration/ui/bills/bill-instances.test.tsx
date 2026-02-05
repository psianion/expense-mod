import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { sampleBillInstance, sampleBill } from '@/tests/helpers/testData'

describe('Bills - Bill Instances', () => {
  it('renders table with headers', () => {
    renderWithProviders(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bill</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Rent</TableCell>
            <TableCell>{sampleBillInstance.due_date}</TableCell>
            <TableCell>{sampleBillInstance.amount}</TableCell>
            <TableCell>
              <Badge>{sampleBillInstance.status}</Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByText('Bill')).toBeInTheDocument()
    expect(screen.getByText('Due date')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(screen.getByText('DUE')).toBeInTheDocument()
  })
})
