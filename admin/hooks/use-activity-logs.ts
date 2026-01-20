"use client"

import { useEffect, useState } from "react"
import {
  subscribeToRecentActivityLogs,
  getRecentActivityLogs,
  type ActivityLog,
} from "@/lib/firebase/services/activity-logs"

export function useActivityLogs(count: number = 20) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToRecentActivityLogs(
      (data) => {
        setLogs(data)
        setLoading(false)
      },
      count
    )

    return () => unsubscribe()
  }, [count])

  const refreshLogs = async () => {
    try {
      setLoading(true)
      const data = await getRecentActivityLogs(count)
      setLogs(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    logs,
    loading,
    error,
    refreshLogs,
  }
}
