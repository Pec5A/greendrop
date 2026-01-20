"use client"

import { useEffect, useState } from "react"
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationService,
  type AdminNotification,
} from "@/lib/firebase/services/notifications"

export function useNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      (data) => {
        setNotifications(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
    } catch (err) {
      throw err
    }
  }

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
    } catch (err) {
      throw err
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationService(notificationId)
    } catch (err) {
      throw err
    }
  }

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
