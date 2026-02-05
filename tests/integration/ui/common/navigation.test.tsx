import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { NavMain } from '@/components/nav-main'
import { SidebarProvider } from '@/components/ui/sidebar'
import { clearMockStore } from '@/tests/setup'

const navItems = [
  { title: 'Home', url: '/', isActive: true, items: [] },
  { title: 'Expenses', url: '/expenses', isActive: false, items: [] },
  { title: 'Bills', url: '/bills', isActive: false, items: [] },
]

function renderNavMain(props: { items: typeof navItems; onItemClick?: (url: string) => void }) {
  return renderWithProviders(
    <SidebarProvider>
      <NavMain items={props.items} onItemClick={props.onItemClick} />
    </SidebarProvider>
  )
}

describe('Navigation', () => {
  beforeEach(() => {
    clearMockStore()
  })

  it('renders navigation group label', () => {
    renderNavMain({ items: navItems })
    expect(screen.getByText('Navigation')).toBeInTheDocument()
  })

  it('renders all nav items', () => {
    renderNavMain({ items: navItems })
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
    expect(screen.getByText('Bills')).toBeInTheDocument()
  })

  it('renders links with correct hrefs', () => {
    renderNavMain({ items: navItems })
    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /expenses/i })).toHaveAttribute('href', '/expenses')
    expect(screen.getByRole('link', { name: /bills/i })).toHaveAttribute('href', '/bills')
  })

  it('exposes nav links for navigation', () => {
    renderNavMain({ items: navItems })
    const expensesLink = screen.getByRole('link', { name: /expenses/i })
    expect(expensesLink).toHaveAttribute('href', '/expenses')
  })
})
