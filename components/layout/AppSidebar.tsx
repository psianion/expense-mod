"use client"

import * as React from "react"
import Link from "next/link"
import {
  Wallet,
  BarChart3,
  Settings,
  Plus,
  Home,
  CalendarClock,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "../ui/sidebar"
import { Button } from "../ui/button"
import { View } from "@/types"
import { useExpenseProvider } from "@/app/expense-provider"

const menuItems = [
  {
    title: "Expenses",
    icon: Wallet,
    href: "/",
    id: "EXPENSES" as View,
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/#analytics",
    id: "ANALYTICS" as View,
  },
  {
    title: "Bills",
    icon: CalendarClock,
    href: "/bills",
    id: "BILLS" as View,
  },
]

const secondaryItems = [
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    id: "SETTINGS" as View,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentView?: View
  onViewChange?: (view: View) => void
}

export function AppSidebar({ currentView = "EXPENSES", onViewChange, ...props }: AppSidebarProps) {
  const { openExpenseDrawer } = useExpenseProvider()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
                  <Link href="/" prefetch>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wallet className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Expense Tracker</span>
                  <span className="truncate text-xs">AI-Powered</span>
                </div>
                  </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentView === item.id}
                    onClick={() => {
                      if (item.id === "EXPENSES" || item.id === "ANALYTICS") {
                        onViewChange?.(item.id)
                      }
                    }}
                  >
                    <Link href={item.href} prefetch>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={openExpenseDrawer}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add Expense</span>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href} prefetch>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                <Home className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <span className="truncate font-semibold">Expense Tracker</span>
                <span className="truncate text-muted-foreground">v1.1.0</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

