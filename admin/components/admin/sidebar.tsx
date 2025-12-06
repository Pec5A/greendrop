"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  FileCheck,
  AlertCircle,
  MapPin,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Boxes,
  Truck,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

const navigationGroups = [
  {
    title: "main",
    items: [{ href: "/dashboard", label: "dashboard", icon: LayoutDashboard }],
  },
  {
    title: "operations",
    items: [
      { href: "/users", label: "users", icon: Users },
      { href: "/orders", label: "orders", icon: ShoppingCart },
      { href: "/catalog", label: "catalog", icon: Boxes },
      { href: "/drivers", label: "drivers", icon: Truck },
      { href: "/chat", label: "chat", icon: MessageSquare },
    ],
  },
  {
    title: "compliance",
    items: [
      { href: "/verifications", label: "verifications", icon: FileCheck },
      { href: "/disputes", label: "disputes", icon: AlertCircle },
      { href: "/legal-zones", label: "legalZones", icon: MapPin },
    ],
  },
  {
    title: "settings",
    items: [{ href: "/config", label: "configuration", icon: Settings }],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { t, language } = useLanguage()

  const sectionTitles: Record<string, Record<string, string>> = {
    en: {
      main: "Main",
      operations: "Operations",
      compliance: "Compliance",
      settings: "Settings",
    },
    fr: {
      main: "Principal",
      operations: "Opérations",
      compliance: "Conformité",
      settings: "Paramètres",
    },
  }

  return (
    <aside
      role="navigation"
      aria-label="Menu principal"
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Leaf className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-semibold text-lg text-sidebar-foreground">GreenDrop</span>}
      </div>

      <nav className="flex-1 space-y-6 p-4" aria-label="Navigation administration">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {sectionTitles[language][group.title]}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        collapsed && "justify-center px-2",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      aria-label={collapsed ? t(item.label) : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {!collapsed && <span>{t(item.label)}</span>}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full"
          aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">{language === "fr" ? "Réduire" : "Collapse"}</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
