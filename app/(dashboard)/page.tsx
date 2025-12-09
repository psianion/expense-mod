import type { Metadata } from 'next'
import HomePage from './_components/home-page'

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'AI-powered expense tracking app',
}

export default function Page() {
  return <HomePage />
}

