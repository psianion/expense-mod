/**
 * UI component test setup.
 * Load after tests/setup.ts when running integration/ui tests.
 * Configures React Testing Library, Next.js mocks, and browser API mocks.
 */
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockBack = vi.fn()
const mockPrefetch = vi.fn()
const mockPathname = '/'
const mockSearchParams = new URLSearchParams()

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    const React = require('react') as typeof import('react')
    return React.createElement('a', { href }, children)
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    prefetch: mockPrefetch,
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
}))

// Mock next-themes (ThemeProvider renders children; avoid theme flicker in tests)
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
}))

// Mock next/image to avoid image loading in tests
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt }: { src: string; alt?: string }) {
    return { $$typeof: Symbol.for('react.element'), type: 'img', props: { src, alt: alt ?? '' } }
  },
}))

// ResizeObserver is not available in jsdom
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// IntersectionObserver is often needed for lazy content
class IntersectionObserverMock {
  root = null
  rootMargin = ''
  thresholds = [0]
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn().mockReturnValue([])
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

// MatchMedia (e.g. for responsive hooks)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
