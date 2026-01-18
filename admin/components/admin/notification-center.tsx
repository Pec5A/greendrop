"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Clock, Package, ShieldAlert, User, X, Bell, BellOff } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"

interface NotificationCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const {
    notifications,
    loading,
    error,
    markAsRead: markNotificationAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationEntry,
  } = useNotifications()
  const [filter, setFilter] = useState<string>("all")

  const unreadCount = notifications.filter((n) => !n.read).length

  const getIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />
      case "warning":
        return <ShieldAlert className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-blue-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "user":
        return <User className="h-4 w-4" />
      case "order":
        return <Package className="h-4 w-4" />
      case "verification":
        return <ShieldAlert className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
    } catch (err) {
      console.error("Error marking notification as read", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (err) {
      console.error("Error marking all notifications as read", err)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationEntry(id)
    } catch (err) {
      console.error("Error deleting notification", err)
    }
  }

  const filteredNotifications =
    filter === "all" ? notifications : notifications.filter((n) => n.category === filter)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount} new
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>Stay updated with real-time alerts</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="user">Users</TabsTrigger>
                <TabsTrigger value="order">Orders</TabsTrigger>
                <TabsTrigger value="verification">Verify</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              Failed to load notifications
            </div>
          )}

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="w-full bg-transparent">
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}

          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BellOff className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      !notification.read ? "bg-muted/30 border-primary/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {getIcon(notification.type)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm leading-none">{notification.title}</p>
                            <Badge variant="outline" className="h-5">
                              {getCategoryIcon(notification.category)}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteNotification(notification.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
