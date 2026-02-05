"use client"

import * as React from "react"
import { AppSidebar } from "@components/layout/AppSidebar"
import { SiteHeader } from "@components/layout/SiteHeader"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

/**
 * Renders the app shell (sidebar + header) only on the client after mount.
 * This avoids hydration mismatch when the browser/test environment injects
 * attributes (e.g. data-cursor-ref) into the DOM—server never sends that
 * markup, so there is no diff to fix.
 */
export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen w-full">
        <div className="flex flex-1 flex-col min-w-0">
          <header className="h-16 shrink-0 border-b" aria-hidden />
          <main className="flex-1 flex flex-col min-h-0">{children}</main>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
