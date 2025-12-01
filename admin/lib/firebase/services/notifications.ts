import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"

export type NotificationType = "alert" | "success" | "info" | "warning"
export type NotificationCategory = "user" | "order" | "verification" | "system"

export interface AdminNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  category: NotificationCategory
}

const convertNotification = (docSnapshot: any): AdminNotification => {
  const data = docSnapshot.data()
  return {
    id: docSnapshot.id,
    type: data.type,
    title: data.title,
    message: data.message,
    timestamp:
      data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp || new Date().toISOString(),
    read: Boolean(data.read),
    category: data.category || "system",
  }
}

export const subscribeToNotifications = (
  callback: (notifications: AdminNotification[]) => void,
  onError?: (error: Error) => void,
  count: number = 50
): Unsubscribe => {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
  const q = query(notificationsRef, orderBy("timestamp", "desc"), limit(count))

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(convertNotification)
      callback(notifications)
    },
    (error) => {
      console.error("Error subscribing to notifications", error)
      onError?.(error)
    }
  )
}

export const createNotification = async (
  notificationData: Omit<AdminNotification, "id" | "timestamp" | "read">
): Promise<string> => {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
  const docRef = await addDoc(notificationsRef, {
    ...notificationData,
    read: false,
    timestamp: serverTimestamp(),
  })
  return docRef.id
}

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId)
  await updateDoc(notificationRef, { read: true })
}

export const markAllNotificationsAsRead = async (): Promise<void> => {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
  const unreadQuery = query(notificationsRef, where("read", "==", false))
  const snapshot = await getDocs(unreadQuery)

  const updates = snapshot.docs.map((docSnapshot) => updateDoc(docSnapshot.ref, { read: true }))
  await Promise.all(updates)
}

export const deleteNotification = async (notificationId: string): Promise<void> => {
  const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId)
  await deleteDoc(notificationRef)
}
