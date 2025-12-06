"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight, Bell, Command } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { LanguageToggle } from "./language-toggle"
import { AdminProfile } from "./admin-profile"
import { NotificationCenter } from "./notification-center"
import { CommandPalette } from "./command-palette"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"

export function Topbar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  const routeLabels: Record<string, string> = {
    "/dashboard": t("dashboard"),
    "/users": t("users"),
    "/orders": t("orders"),
    "/verifications": t("verifications"),
    "/disputes": t("disputes"),
    "/legal-zones": t("legalZones"),
    "/config": t("configuration"),
  }

  const currentLabel = routeLabels[pathname] || t("dashboard")

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-foreground font-medium">GreenDrop Admin</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{currentLabel}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 text-muted-foreground bg-transparent"
          >
            <Command className="h-4 w-4" />
            <span className="text-xs">Quick Actions</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(true)}>
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">3</Badge>
          </Button>

          <LanguageToggle />
          <ThemeToggle />
          <AdminProfile />
        </div>
      </header>

      <NotificationCenter open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNotifications={() => setNotificationsOpen(true)}
      />
    </>
  )
}
