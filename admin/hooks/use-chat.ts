"use client"

import { useEffect, useState, useCallback } from "react"
import type { ChatMessage } from "@/lib/types"
import {
  subscribeToMessages,
  sendMessage as sendMessageService,
  markMessagesAsRead,
} from "@/lib/firebase/services/chats"
import { useAuth } from "@/lib/firebase/auth-context"

export function useChat(orderId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, userProfile } = useAuth()

  useEffect(() => {
    if (!orderId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToMessages(
      orderId,
      (data) => {
        setMessages(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orderId])

  // Mark messages as read when new messages arrive
  useEffect(() => {
    if (orderId && user?.uid && messages.length > 0) {
      markMessagesAsRead(orderId, user.uid).catch(() => {})
    }
  }, [orderId, user?.uid, messages.length])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!orderId || !user?.uid || !userProfile) return

      await sendMessageService(
        orderId,
        user.uid,
        userProfile.name || user.email || "Admin",
        userProfile.role || "admin",
        content
      )
    },
    [orderId, user, userProfile]
  )

  return {
    messages,
    loading,
    error,
    sendMessage,
  }
}
