import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  where,
  limit,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type { ChatMessage, ChatThread } from "@/lib/types"

const convertMessage = (doc: any): ChatMessage => {
  const data = doc.data()
  return {
    id: doc.id,
    orderId: data.orderId ?? "",
    senderId: data.senderId ?? "",
    senderName: data.senderName ?? "",
    senderRole: data.senderRole ?? "",
    content: data.content ?? "",
    timestamp:
      data.timestamp instanceof Timestamp
        ? data.timestamp.toDate().toISOString()
        : (data.timestamp ?? new Date().toISOString()),
    isRead: data.isRead ?? false,
  }
}

// Subscribe to messages for an order (real-time)
export const subscribeToMessages = (
  orderId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const messagesRef = collection(db, COLLECTIONS.CHATS, orderId, "messages")
  const q = query(messagesRef, orderBy("timestamp", "asc"))

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map(convertMessage)
      callback(messages)
    },
    (error) => {
      console.error("Error subscribing to chat messages:", error)
      onError?.(error)
    }
  )
}

// Send a message
export const sendMessage = async (
  orderId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  content: string
): Promise<string> => {
  const messagesRef = collection(db, COLLECTIONS.CHATS, orderId, "messages")
  const docRef = await addDoc(messagesRef, {
    orderId,
    senderId,
    senderName,
    senderRole,
    content,
    timestamp: serverTimestamp(),
    isRead: false,
  })

  // Update chat thread metadata
  const chatRef = doc(db, COLLECTIONS.CHATS, orderId)
  await updateDoc(chatRef, {
    lastMessage: content,
    lastMessageAt: serverTimestamp(),
  }).catch(() => {
    // Chat doc may not exist yet — create via set is handled by Firestore rules
  })

  return docRef.id
}

// Mark messages as read
export const markMessagesAsRead = async (orderId: string, currentUserId: string): Promise<void> => {
  const messagesRef = collection(db, COLLECTIONS.CHATS, orderId, "messages")
  const q = query(messagesRef, where("isRead", "==", false), where("senderId", "!=", currentUserId))
  const snapshot = await getDocs(q)

  const updates = snapshot.docs.map((d) =>
    updateDoc(doc(db, COLLECTIONS.CHATS, orderId, "messages", d.id), {
      isRead: true,
    })
  )
  await Promise.all(updates)
}

// Get recent chat threads (for chat list)
export const subscribeToChatThreads = (
  callback: (threads: ChatThread[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const chatsRef = collection(db, COLLECTIONS.CHATS)
  const q = query(chatsRef, orderBy("lastMessageAt", "desc"), limit(50))

  return onSnapshot(
    q,
    (snapshot) => {
      const threads: ChatThread[] = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          orderId: d.id,
          participants: data.participants ?? [],
          lastMessage: data.lastMessage ?? "",
          lastMessageAt:
            data.lastMessageAt instanceof Timestamp ? data.lastMessageAt.toDate().toISOString() : data.lastMessageAt,
          unreadCount: data.unreadCount ?? 0,
        }
      })
      callback(threads)
    },
    (error) => {
      console.error("Error subscribing to chat threads:", error)
      onError?.(error)
    }
  )
}
