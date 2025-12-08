"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ShoppingCart, UserPlus, FileCheck, AlertCircle } from "lucide-react"
import {
  subscribeToRecentActivityLogs,
  type ActivityLog,
} from "@/lib/firebase/services/activity-logs"

function getIconForType(type: string) {
  const normalized = type.toLowerCase()
  if (normalized.includes("order")) return ShoppingCart
  if (normalized.includes("user") || normalized.includes("login")) return UserPlus
  if (normalized.includes("verification")) return FileCheck
  if (normalized.includes("dispute")) return AlertCircle
  return ShoppingCart
}

function getBadgeForType(type: string): string {
  const normalized = type.toLowerCase()
  if (normalized.includes("create")) return "New"
  if (normalized.includes("approve") || normalized.includes("resolved")) return "Complete"
  if (normalized.includes("reject") || normalized.includes("cancel")) return "Rejected"
  if (normalized.includes("update")) return "Updated"
  if (normalized.includes("login")) return "Login"
  return "Activity"
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToRecentActivityLogs(
      (logs) => {
        setActivities(logs.slice(0, 5))
        setLoading(false)
      },
      10,
      (error) => {
        console.error("Failed to load recent activity:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getIconForType(activity.type)
              const actor = activity.userName || activity.userId || "System"
              return (
                <div key={activity.id} className="flex items-center gap-4">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-muted">
                      <Icon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {actor}{" "}
                      <span className="text-muted-foreground font-normal">{activity.message}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getBadgeForType(activity.type)}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
