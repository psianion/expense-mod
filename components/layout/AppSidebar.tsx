"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Wallet, Plus } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuth } from "@/app/providers/AuthProvider"
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
import { useExpenseUIProvider } from "@/app/providers/ExpenseUIProvider"
import { sidebarConfig, appInfo } from "@/lib/sidebar-config"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const { openExpenseDrawer } = useExpenseUIProvider()
  const { user, isDemo, isMaster, signOut } = useAuth()
  const { state } = useSidebar()
  const pathname = usePathname()

  // Transform sidebar config to NavMain format with active state detection
  const navMainItems = sidebarConfig.mainNav.map((item) => ({
    title: item.title,
    url: item.href,
    icon: item.icon,
    isActive: pathname === item.href,
    items: [], // No sub-items for now
  }))

  // Add Settings to navMain
  const allNavItems = [
    ...navMainItems,
    ...sidebarConfig.secondaryNav.map((item) => ({
      title: item.title,
      url: item.href,
      icon: item.icon,
      isActive: pathname === item.href,
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

  // User for NavUser: from auth or fallback to app info
  const navUser = user
    ? {
        name: user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: undefined as string | undefined,
      }
    : {
        name: appInfo.name,
        email: appInfo.version,
        avatar: "/avatars/default.jpg",
      }
  const badge = isDemo ? "demo" : isMaster ? "master" : undefined

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={allNavItems} />
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
                  <Plus className="mr-0 h-4 w-4" />
                  {state !== "collapsed" && <span>Add Expense</span>}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={navUser}
          onLogout={user && !isDemo ? signOut : undefined}
          badge={badge}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}