import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../styles/globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'AI-powered expense tracking app',
}

export default function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

