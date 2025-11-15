import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type { Order, OrderDocument, OrderItem, OrderTimelineEvent, OrderStatus } from "@/lib/types"

const normalizeDate = (value: any) =>
  value instanceof Timestamp ? value.toDate().toISOString() : value

const createTimelineEvent = (partial: Omit<OrderTimelineEvent, "id">): OrderTimelineEvent => ({
  id: `evt_${Math.random().toString(36).slice(2, 10)}`,
  ...partial,
})

// Convert Firestore document to Order type
const convertOrder = (doc: any): Order => {
  const data = doc.data()
  return {
    id: doc.id,
    userId: data.userId,
    shopId: data.shopId,
    status: data.status,
    total: data.total,
    items: data.items || [],
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
    priority: data.priority,
    reference: data.reference,
    currency: data.currency,
    driverId: data.driverId ?? null,
    driverName: data.driverName,
    driverPhone: data.driverPhone,
    pickupAddress: data.pickupAddress,
    dropoffAddress: data.dropoffAddress,
    addresses: data.addresses || [],
    expectedDelivery: data.expectedDelivery ? normalizeDate(data.expectedDelivery) : data.expectedDelivery,
    deliveredAt: data.deliveredAt ? normalizeDate(data.deliveredAt) : data.deliveredAt,
    notes: data.notes || [],
    timeline: (data.timeline || []).map((event: any) => ({
      ...event,
      timestamp: normalizeDate(event.timestamp),
    })),
    documents: (data.documents || []).map((document: any) => ({
      ...document,
      uploadedAt: normalizeDate(document.uploadedAt),
    })),
  }
}

// Get all orders
export const getOrders = async (): Promise<Order[]> => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS)
  const q = query(ordersRef, orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertOrder)
}

// Get order by ID
export const getOrderById = async (id: string): Promise<Order | null> => {
  const docRef = doc(db, COLLECTIONS.ORDERS, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return convertOrder(docSnap)
  }
  return null
}

// Get orders by user ID
export const getOrdersByUserId = async (userId: string): Promise<Order[]> => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS)
  const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertOrder)
}

// Get orders by status
export const getOrdersByStatus = async (status: Order["status"]): Promise<Order[]> => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS)
  const q = query(ordersRef, where("status", "==", status))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertOrder)
}

// Create order
export const createOrder = async (
  orderData: Omit<Order, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS)
  const docRef = await addDoc(ordersRef, {
    ...orderData,
    timeline: orderData.timeline ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

// Update order
export const updateOrder = async (id: string, orderData: Partial<Order>): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.ORDERS, id)
  await updateDoc(docRef, {
    ...orderData,
    updatedAt: serverTimestamp(),
  })
}

// Update order status
export const updateOrderStatus = async (id: string, status: Order["status"]): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.ORDERS, id)
  const order = await getOrderById(id)
  const timeline = order?.timeline ?? []
  const event = createTimelineEvent({
    orderId: id,
    type: "status",
    title: `Status changed to ${status}`,
    description: `Order updated to ${status}`,
    timestamp: new Date().toISOString(),
    status: status === "delivered" ? "completed" : "current",
  })

  await updateDoc(docRef, {
    status,
    timeline: [...timeline, event],
    ...(status === "delivered" ? { deliveredAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  })
}

// Delete order
export const deleteOrder = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.ORDERS, id)
  await deleteDoc(docRef)
}

// Add item to order
export const addOrderItem = async (orderId: string, item: OrderItem): Promise<void> => {
  const order = await getOrderById(orderId)
  if (order) {
    const updatedItems = [...order.items, item]
    const newTotal = updatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    await updateOrder(orderId, {
      items: updatedItems,
      total: newTotal,
      updatedAt: new Date().toISOString(),
    })
  }
}

export const appendOrderTimelineEvent = async (
  orderId: string,
  event: Omit<OrderTimelineEvent, "id">,
): Promise<void> => {
  const order = await getOrderById(orderId)
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }
  const docRef = doc(db, COLLECTIONS.ORDERS, orderId)
  await updateDoc(docRef, {
    timeline: [...(order.timeline || []), createTimelineEvent(event)],
    updatedAt: serverTimestamp(),
  })
}

export const addOrderDocument = async (
  orderId: string,
  document: Omit<OrderDocument, "id" | "uploadedAt" | "orderId">,
): Promise<void> => {
  const order = await getOrderById(orderId)
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }
  const docRef = doc(db, COLLECTIONS.ORDERS, orderId)
  const newDocument: OrderDocument = {
    id: `doc_${Math.random().toString(36).slice(2, 10)}`,
    orderId,
    uploadedAt: new Date().toISOString(),
    ...document,
  }

  await updateDoc(docRef, {
    documents: [...(order.documents || []), newDocument],
    updatedAt: serverTimestamp(),
  })
}

export const assignDriverToOrder = async (
  orderId: string,
  driver: { id: string; name: string; phone?: string },
): Promise<void> => {
  const order = await getOrderById(orderId)
  if (!order) throw new Error(`Order ${orderId} not found`)
  const docRef = doc(db, COLLECTIONS.ORDERS, orderId)
  const events = order.timeline || []
  const event = createTimelineEvent({
    orderId,
    type: "assignment",
    title: "Driver assigned",
    description: `${driver.name} assigned to delivery`,
    actor: driver.name,
    timestamp: new Date().toISOString(),
    status: "current",
    metadata: { driverId: driver.id },
  })

  await updateDoc(docRef, {
    driverId: driver.id,
    driverName: driver.name,
    driverPhone: driver.phone ?? null,
    timeline: [...events, event],
    updatedAt: serverTimestamp(),
  })
}

// Subscribe to orders (real-time updates)
export const subscribeToOrders = (
  callback: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS)
  const q = query(ordersRef, orderBy("createdAt", "desc"))
  
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map(convertOrder)
      callback(orders)
    },
    (error) => {
      console.error("Error subscribing to orders:", error)
      onError?.(error)
    }
  )
}

// Subscribe to orders by status
export const subscribeToOrdersByStatus = (
  status: Order["status"],
  callback: (orders: Order[]) => void
): Unsubscribe => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS)
  const q = query(ordersRef, where("status", "==", status))
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(convertOrder)
    callback(orders)
  })
}

// Get order statistics
export const getOrderStats = async () => {
  const orders = await getOrders()
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  
  const deliveredToday = orders.filter((o) => {
    if (o.status !== "delivered" || !o.deliveredAt) return false
    return new Date(o.deliveredAt).getTime() >= startOfDay.getTime()
  }).length

  const delayedOrders = orders.filter((o) => {
    if (!o.expectedDelivery) return false
    if (o.status === "delivered" || o.status === "cancelled") return false
    return new Date(o.expectedDelivery).getTime() < now.getTime()
  }).length

  const deliveredCount = orders.filter((o) => o.status === "delivered").length
  const onTimeDeliveries = orders.filter((o) => {
    if (o.status !== "delivered" || !o.expectedDelivery || !o.deliveredAt) return false
    return new Date(o.deliveredAt).getTime() <= new Date(o.expectedDelivery).getTime()
  }).length

  return {
    total: orders.length,
    created: orders.filter((o) => o.status === "created").length,
    paid: orders.filter((o) => o.status === "paid").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    pendingShipment: orders.filter((o) => o.status === "paid").length,
    deliveredToday,
    delayedOrders,
    onTimeRate: deliveredCount === 0 ? 100 : Math.round((onTimeDeliveries / deliveredCount) * 100),
    totalRevenue: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0),
  }
}
