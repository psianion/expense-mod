"use client"

import * as React from "react"
import { Wallet, Plus } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { View } from "@/types"
import { useExpenseProvider } from "@/app/expense-provider"
import { sidebarConfig, appInfo } from "@/lib/sidebar-config"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentView?: View
  onViewChange?: (view: View) => void
}

export function AppSidebar({ currentView = "EXPENSES", onViewChange, ...props }: AppSidebarProps) {
  const { openExpenseDrawer } = useExpenseProvider()
  const { state } = useSidebar()

  // Transform sidebar config to NavMain format
  const navMainItems = sidebarConfig.mainNav.map((item) => ({
    title: item.title,
    url: item.href,
    icon: item.icon,
    isActive: currentView === item.id,
    items: [], // No sub-items for now
  }))

  // Add Settings to navMain
  const allNavItems = [
    ...navMainItems,
    ...sidebarConfig.secondaryNav.map((item) => ({
      title: item.title,
      url: item.href,
      icon: item.icon,
      isActive: currentView === item.id,
      items: [],
    })),
  ]

  // Team data for TeamSwitcher (using app info)
  const teams = [
    {
      name: appInfo.name,
      logo: Wallet,
      plan: appInfo.subtitle,
    },
  ]

  // User data for NavUser (using app info)
  const user = {
    name: appInfo.name,
    email: appInfo.version,
    avatar: "/avatars/default.jpg",
  }

  const handleNavClick = (url: string) => {
    // Find the item by URL and trigger onViewChange if needed
    const allItems = [...sidebarConfig.mainNav, ...sidebarConfig.secondaryNav]
    const item = allItems.find((i) => i.href === url)
    if (item && (item.id === "EXPENSES" || item.id === "ANALYTICS")) {
      onViewChange?.(item.id as View)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={allNavItems} onItemClick={handleNavClick} />
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button
                  variant="default"
                  className={`${state !== "collapsed" ? "w-full" : "w-8"} flex justify-center items-center p-0 h-8`}
                  onClick={openExpenseDrawer}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {state !== "collapsed" && <span>Add Expense</span>}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}