"use client"

import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { queryKeys } from "@/lib/query/queryKeys"
import { expensesApi, billsApi, billInstancesApi } from "@/lib/api"

export function NavMain({
  items,
  onItemClick,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  onItemClick?: (url: string) => void
}) {
  const queryClient = useQueryClient()

  const prefetchRouteData = async (url: string) => {
    try {
      switch (url) {
        case '/expenses':
          // Prefetch expenses data
          await queryClient.prefetchQuery({
            queryKey: queryKeys.expenses.list(),
            queryFn: () => expensesApi.getExpenses(),
            staleTime: 1000 * 60 * 1, // 1 minute
          })
          break
        case '/bills':
          // Prefetch bills and bill instances data
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: queryKeys.bills.list(),
              queryFn: () => billsApi.getBills(),
              staleTime: 1000 * 60 * 1,
            }),
            queryClient.prefetchQuery({
              queryKey: queryKeys.billInstances.list(['DUE']),
              queryFn: () => billInstancesApi.getBillInstances(['DUE']),
              staleTime: 1000 * 60 * 1,
            })
          ])
          break
        case '/dashboard':
          // Prefetch dashboard data (recent expenses and upcoming bills)
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: queryKeys.expenses.recent(5),
              queryFn: () => expensesApi.getRecentExpenses(5),
              staleTime: 1000 * 60 * 1,
            }),
            queryClient.prefetchQuery({
              queryKey: queryKeys.billInstances.upcoming(5),
              queryFn: () => billInstancesApi.getUpcomingBills(5),
              staleTime: 1000 * 60 * 1,
            })
          ])
          break
      }
    } catch (error) {
      // Silently fail prefetch - don't block navigation
      console.debug('Prefetch failed for route:', url, error)
    }
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={item.isActive}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            onMouseEnter={() => prefetchRouteData(subItem.url)}
                          >
                            <Link href={subItem.url} prefetch>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={item.isActive}
                onClick={() => onItemClick?.(item.url)}
                onMouseEnter={() => prefetchRouteData(item.url)}
              >
                <Link href={item.url} prefetch>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
