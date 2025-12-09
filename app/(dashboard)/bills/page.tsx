import type { Metadata } from 'next'
import BillsPage from '../_components/bills-page'

export const metadata: Metadata = {
  title: 'Bills & Instances',
}

export default function Page() {
  return <BillsPage />
}

