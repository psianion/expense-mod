'use client'

import React, { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { createQueryClient } from '@/lib/query/queryClient'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ExpenseUIProvider } from '@/app/providers/ExpenseUIProvider'

export interface AllProvidersOptions {
  queryClient?: QueryClient
  onSave?: (expenseData: unknown) => Promise<void>
  isLoading?: boolean
}

function createTestQueryClient() {
  return createQueryClient()
}

function AllProviders({
  children,
  queryClient,
  onSave,
  isLoading = false,
}: {
  children: ReactNode
  queryClient?: QueryClient
  onSave?: (expenseData: unknown) => Promise<void>
  isLoading?: boolean
}) {
  const client = queryClient ?? createTestQueryClient()
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <AuthProvider>
          <ExpenseUIProvider onSave={onSave} isLoading={isLoading}>
            {children}
          </ExpenseUIProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  onSave?: (expenseData: unknown) => Promise<void>
  isLoading?: boolean
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const {
    queryClient,
    onSave,
    isLoading,
    ...renderOptions
  } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AllProviders queryClient={queryClient} onSave={onSave} isLoading={isLoading}>
        {children}
      </AllProviders>
    )
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

export async function waitForLoadingToFinish(
  findByRole: (role: string, options?: { name?: string | RegExp }) => Promise<HTMLElement>,
  options?: { timeout?: number }
) {
  const timeout = options?.timeout ?? 2000
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const loading = document.querySelector('[aria-busy="true"], [data-state="loading"]')
    if (!loading) break
    await new Promise((r) => setTimeout(r, 50))
  }
  await findByRole('generic', {}).catch(() => ({}))
}

export interface FormFieldEntry {
  name: string
  type: 'text' | 'number' | 'checkbox' | 'combobox'
  value: string | number | boolean
}

export async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  fields: FormFieldEntry[],
  container?: HTMLElement
) {
  const root = container ?? document.body
  for (const field of fields) {
    if (field.type === 'checkbox') {
      const el = root.querySelector(`[name="${field.name}"]`) ?? root.querySelector(`[aria-label="${field.name}"]`)
      if (el && el instanceof HTMLInputElement) {
        if (Boolean(field.value) !== el.checked) await user.click(el)
      }
      continue
    }
    const el = root.querySelector(`[name="${field.name}"]`) ?? root.querySelector(`[aria-label="${field.name}"]`) ?? root.querySelector(`input, [role="combobox"]`)
    if (el) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        await user.clear(el)
        await user.type(el, String(field.value))
      }
    }
  }
}
