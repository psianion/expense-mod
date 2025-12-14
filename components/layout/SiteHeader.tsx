"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb"
import { Separator } from "../ui/separator"
import {
  SidebarTrigger,
} from "../ui/sidebar"
import { ThemeTogglerButton } from '../animate-ui/components/buttons/theme-toggler'

interface SiteHeaderProps {}

const getPageTitle = (pathname: string): string => {
  if (pathname === "/") return "Home"
  if (pathname === "/expenses") return "Expenses"
  if (pathname === "/analytics") return "Analytics"
  if (pathname === "/bills") return "Bills"
  if (pathname === "/settings") return "Settings"
  return "Expense Tracker"
}

export function SiteHeader({}: SiteHeaderProps) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const pageTitle = getPageTitle(pathname)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">
                Expense Tracker
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {pageTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {mounted && (
        <div className="px-4">
          <ThemeTogglerButton
            variant="ghost"
            modes={['light', 'dark']}
            direction="rtl"
            size='lg'
          />
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button> */}
        </div>
      )}
    </header>
  )
}

