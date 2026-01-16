"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Users,
  Package,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Settings,
  Moon,
  Sun,
  Download,
  Bell,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"

interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onExport?: () => void
  onNotifications?: () => void
}

export function CommandPalette({ open: controlledOpen, onOpenChange, onExport, onNotifications }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false)
      command()
    },
    [setOpen],
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/users"))}>
            <Users className="mr-2 h-4 w-4" />
            Users
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/orders"))}>
            <Package className="mr-2 h-4 w-4" />
            Orders
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/verifications"))}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verifications
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/disputes"))}>
            <AlertCircle className="mr-2 h-4 w-4" />
            Disputes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/legal-zones"))}>
            <MapPin className="mr-2 h-4 w-4" />
            Legal Zones
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/config"))}>
            <Settings className="mr-2 h-4 w-4" />
            Configuration
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {onExport && (
            <CommandItem onSelect={() => runCommand(onExport)}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </CommandItem>
          )}
          {onNotifications && (
            <CommandItem onSelect={() => runCommand(onNotifications)}>
              <Bell className="mr-2 h-4 w-4" />
              View Notifications
            </CommandItem>
          )}
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Toggle Theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
