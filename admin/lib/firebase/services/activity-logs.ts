import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"

// Activity log types
export type ActivityType =
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "order_created"
  | "order_updated"
  | "order_cancelled"
  | "order_driver_assigned"
  | "verification_approved"
  | "verification_rejected"
  | "dispute_created"
  | "dispute_resolved"
  | "dispute_closed"
  | "zone_created"
  | "zone_updated"
  | "zone_deleted"
  | "config_updated"
  | "product_created"
  | "product_updated"
  | "merchant_created"
  | "merchant_updated"
  | "driver_status_changed"
  | "login"
  | "logout"

export interface ActivityLog {
  id: string
  type: ActivityType
  message: string
  userId?: string
  userName?: string
  entityId?: string
  entityType?: string
  metadata?: Record<string, any>
  createdAt: string
}

// Convert Firestore document to ActivityLog type
const convertActivityLog = (doc: any): ActivityLog => {
  const data = doc.data()
  return {
    id: doc.id,
    type: data.type,
    message: data.message,
    userId: data.userId,
    userName: data.userName,
    entityId: data.entityId,
    entityType: data.entityType,
    metadata: data.metadata,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt,
  }
}

// Subscribe to activity logs for a specific entity
export function subscribeToActivityLogsForEntity(
  entityType: string,
  entityId: string,
  onUpdate: (logs: ActivityLog[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS)
  const q = query(
    logsRef,
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    orderBy("createdAt", "desc"),
    limit(50)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: ActivityLog[] = []
      snapshot.forEach((doc) => {
        logs.push(convertActivityLog(doc))
      })
      onUpdate(logs)
    },
    (error) => {
      console.error("Activity logs subscription error:", error)
      if (onError) onError(error)
    }
  )
}

// Create activity log entry
export const createActivityLog = async (
  logData: Omit<ActivityLog, "id" | "createdAt">
): Promise<string> => {
  const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS)
  const docRef = await addDoc(logsRef, {
    ...logData,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// Helper functions for common activity types
export const logUserCreated = async (userId: string, userName: string): Promise<string> => {
  return createActivityLog({
    type: "user_created",
    message: `New user "${userName}" was created`,
    entityId: userId,
    entityType: "user",
    userName,
  })
}

export const logUserUpdated = async (
  userId: string,
  userName: string,
  changes?: Record<string, any>
): Promise<string> => {
  return createActivityLog({
    type: "user_updated",
    message: `User "${userName}" was updated`,
    entityId: userId,
    entityType: "user",
    userName,
    metadata: changes,
  })
}

export const logUserDeleted = async (userId: string, userName: string): Promise<string> => {
  return createActivityLog({
    type: "user_deleted",
    message: `User "${userName}" was deleted`,
    entityId: userId,
    entityType: "user",
    userName,
  })
}

export const logOrderCreated = async (orderId: string, userId: string): Promise<string> => {
  return createActivityLog({
    type: "order_created",
    message: `New order ${orderId} was created`,
    entityId: orderId,
    entityType: "order",
    userId,
  })
}

export const logOrderUpdated = async (
  orderId: string,
  status: string,
  adminId?: string
): Promise<string> => {
  return createActivityLog({
    type: "order_updated",
    message: `Order ${orderId} status changed to "${status}"`,
    entityId: orderId,
    entityType: "order",
    userId: adminId,
    metadata: { status },
  })
}

export const logOrderDriverAssigned = async (
  orderId: string,
  driverName: string,
  driverId?: string
): Promise<string> => {
  return createActivityLog({
    type: "order_driver_assigned",
    message: `Driver ${driverName} assigned to order ${orderId}`,
    entityId: orderId,
    entityType: "order",
    metadata: { driverId, driverName },
  })
}

export const logVerificationApproved = async (
  verificationId: string,
  userId: string,
  reviewerEmail: string
): Promise<string> => {
  return createActivityLog({
    type: "verification_approved",
    message: `Verification ${verificationId} was approved`,
    entityId: verificationId,
    entityType: "verification",
    userId,
    userName: reviewerEmail,
  })
}

export const logVerificationRejected = async (
  verificationId: string,
  userId: string,
  reviewerEmail: string,
  reason?: string
): Promise<string> => {
  return createActivityLog({
    type: "verification_rejected",
    message: `Verification ${verificationId} was rejected`,
    entityId: verificationId,
    entityType: "verification",
    userId,
    userName: reviewerEmail,
    metadata: { reason },
  })
}

export const logZoneCreated = async (
  zoneId: string,
  zoneName: string,
  zoneType: string
): Promise<string> => {
  return createActivityLog({
    type: "zone_created",
    message: `Zone "${zoneName}" (${zoneType}) was created`,
    entityId: zoneId,
    entityType: "legalZone",
    metadata: { type: zoneType },
  })
}

export const logZoneUpdated = async (
  zoneId: string,
  zoneName: string,
  changes?: Record<string, any>
): Promise<string> => {
  return createActivityLog({
    type: "zone_updated",
    message: `Zone "${zoneName}" was updated`,
    entityId: zoneId,
    entityType: "legalZone",
    metadata: changes,
  })
}

export const logZoneDeleted = async (zoneId: string, zoneName: string): Promise<string> => {
  return createActivityLog({
    type: "zone_deleted",
    message: `Zone "${zoneName}" was deleted`,
    entityId: zoneId,
    entityType: "legalZone",
  })
}

export const logProductCreated = async (productId: string, productName: string): Promise<string> => {
  return createActivityLog({
    type: "product_created",
    message: `Product "${productName}" added to catalog`,
    entityId: productId,
    entityType: "product",
  })
}

export const logProductUpdated = async (
  productId: string,
  productName: string,
  changes?: Record<string, any>
): Promise<string> => {
  return createActivityLog({
    type: "product_updated",
    message: `Product "${productName}" updated`,
    entityId: productId,
    entityType: "product",
    metadata: changes,
  })
}

export const logMerchantUpdated = async (
  merchantId: string,
  merchantName: string,
  changes?: Record<string, any>
): Promise<string> => {
  return createActivityLog({
    type: "merchant_updated",
    message: `Merchant "${merchantName}" updated`,
    entityId: merchantId,
    entityType: "merchant",
    metadata: changes,
  })
}

export const logDriverStatusChanged = async (
  driverId: string,
  driverName: string,
  status: string
): Promise<string> => {
  return createActivityLog({
    type: "driver_status_changed",
    message: `Driver ${driverName} is now ${status}`,
    entityId: driverId,
    entityType: "driver",
    metadata: { status },
  })
}

export const logDisputeResolved = async (
  disputeId: string,
  resolverEmail: string,
  resolution: string
): Promise<string> => {
  return createActivityLog({
    type: "dispute_resolved",
    message: `Dispute ${disputeId} was resolved`,
    entityId: disputeId,
    entityType: "dispute",
    userName: resolverEmail,
    metadata: { resolution },
  })
}

export const logLogin = async (userId: string, userEmail: string): Promise<string> => {
  return createActivityLog({
    type: "login",
    message: `User "${userEmail}" logged in`,
    userId,
    userName: userEmail,
  })
}

export const logLogout = async (userId: string, userEmail: string): Promise<string> => {
  return createActivityLog({
    type: "logout",
    message: `User "${userEmail}" logged out`,
    userId,
    userName: userEmail,
  })
}

// Get recent activity logs
export const getRecentActivityLogs = async (count: number = 50): Promise<ActivityLog[]> => {
  const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS)
  const q = query(logsRef, orderBy("createdAt", "desc"), limit(count))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertActivityLog)
}

// Get activity logs by entity
export const getActivityLogsByEntity = async (
  entityType: string,
  entityId: string
): Promise<ActivityLog[]> => {
  const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS)
  const q = query(
    logsRef,
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertActivityLog)
}

// Get activity logs by user
export const getActivityLogsByUser = async (userId: string): Promise<ActivityLog[]> => {
  const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS)
  const q = query(logsRef, where("userId", "==", userId), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertActivityLog)
}

// Subscribe to recent activity logs (real-time)
export const subscribeToRecentActivityLogs = (
  callback: (logs: ActivityLog[]) => void,
  count: number = 20,
  onError?: (error: Error) => void
): Unsubscribe => {
  const logsRef = collection(db, COLLECTIONS.ACTIVITY_LOGS)
  const q = query(logsRef, orderBy("createdAt", "desc"), limit(count))

  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map(convertActivityLog)
      callback(logs)
    },
    (error) => {
      console.error("Error subscribing to activity logs", error)
      onError?.(error)
    }
  )
}
