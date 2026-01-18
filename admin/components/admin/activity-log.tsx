"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Edit, Trash2, UserPlus, Settings } from "lucide-react"
import {
  subscribeToRecentActivityLogs,
  type ActivityLog as ActivityLogEntry,
} from "@/lib/firebase/services/activity-logs"

export function ActivityLog() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToRecentActivityLogs(
      (logs) => {
        setEntries(logs)
        setLoading(false)
      },
      20,
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const getIcon = (type: string) => {
    const normalized = type.toLowerCase()
    if (normalized.includes("approve") || normalized.includes("resolved")) {
      return <CheckCircle className="h-4 w-4 text-emerald-500" />
    }
    if (normalized.includes("reject") || normalized.includes("cancel")) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (normalized.includes("create")) {
      return <UserPlus className="h-4 w-4 text-blue-500" />
    }
    if (normalized.includes("update")) {
      return <Edit className="h-4 w-4 text-yellow-500" />
    }
    if (normalized.includes("delete")) {
      return <Trash2 className="h-4 w-4 text-red-500" />
    }
    return <Settings className="h-4 w-4 text-slate-500" />
  }

  const getTypeColor = (type: string) => {
    const normalized = type.toLowerCase()
    if (normalized.includes("approve") || normalized.includes("resolved")) {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    }
    if (normalized.includes("reject") || normalized.includes("cancel")) {
      return "bg-red-500/10 text-red-700 dark:text-red-400"
    }
    if (normalized.includes("create")) {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    }
    if (normalized.includes("update")) {
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
    }
    if (normalized.includes("delete")) {
      return "bg-red-500/10 text-red-700 dark:text-red-400"
    }
    return "bg-slate-500/10 text-slate-700 dark:text-slate-400"
  }

  const formatTypeLabel = (type: string) => type.replace(/_/g, " ")

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            Unable to load activity log
          </div>
        )}
        {loading && !entries.length && (
          <div className="text-sm text-muted-foreground p-4 text-center">Loading recent activity...</div>
        )}
        {!loading && entries.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 text-center">No recent activity</div>
        )}
        {entries.map((entry) => {
          const actor = entry.userName || entry.userId || "System"
          const target = entry.metadata?.targetName || entry.entityId || entry.entityType || "—"
          return (
            <div key={entry.id} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10">
                  {actor.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getIcon(entry.type)}
                  <p className="text-sm font-medium">{entry.message}</p>
                  <Badge variant="outline" className={`ml-auto ${getTypeColor(entry.type)}`}>
                    {formatTypeLabel(entry.type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  by <span className="font-medium">{actor}</span>
                  {target && target !== "—" && (
                    <>
                      {" "}on <span className="font-medium">{target}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
