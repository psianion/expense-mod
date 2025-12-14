import {
  Wallet,
  BarChart3,
  Settings,
  Home,
  CalendarClock,
  LucideIcon,
} from "lucide-react"
import sidebarConfigJson from "./sidebar-config.json"

export interface SidebarItem {
  title: string
  icon: LucideIcon
  href: string
  id: string
  isActive?: boolean
}

export interface SidebarGroup {
  title: string
  items: SidebarItem[]
}

const iconMap: Record<string, LucideIcon> = {
  Wallet,
  BarChart3,
  Settings,
  Home,
  CalendarClock,
}

export const sidebarConfig = {
  mainNav: sidebarConfigJson.mainNav.map((item) => ({
    ...item,
    icon: iconMap[item.icon],
  })),
  secondaryNav: sidebarConfigJson.secondaryNav.map((item) => ({
    ...item,
    icon: iconMap[item.icon],
  })),
}

export const appInfo = sidebarConfigJson.appInfo
