import type { Metadata } from 'next'
import BillsTable from '../../../features/bills/components/BillsTable'

export const metadata: Metadata = {
  title: 'Bills & Instances',
}

export default function Page() {
  return <BillsTable />
}

