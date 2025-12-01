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
import type { Dispute } from "@/lib/types"

// Convert Firestore document to Dispute type
const convertDispute = (doc: any): Dispute => {
  const data = doc.data()
  return {
    id: doc.id,
    orderId: data.orderId,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    reason: data.reason,
    description: data.description,
    status: data.status,
    priority: data.priority,
    amount: data.amount,
    createdAt: data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate().toISOString() 
      : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate().toISOString() 
      : data.updatedAt,
    resolvedAt: data.resolvedAt instanceof Timestamp 
      ? data.resolvedAt.toDate().toISOString() 
      : data.resolvedAt,
    resolvedBy: data.resolvedBy,
    resolution: data.resolution,
  }
}

// Get all disputes
export const getDisputes = async (): Promise<Dispute[]> => {
  const disputesRef = collection(db, COLLECTIONS.DISPUTES)
  const q = query(disputesRef, orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertDispute)
}

// Get dispute by ID
export const getDisputeById = async (id: string): Promise<Dispute | null> => {
  const docRef = doc(db, COLLECTIONS.DISPUTES, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return convertDispute(docSnap)
  }
  return null
}

// Get disputes by user ID
export const getDisputesByUserId = async (userId: string): Promise<Dispute[]> => {
  const disputesRef = collection(db, COLLECTIONS.DISPUTES)
  const q = query(disputesRef, where("userId", "==", userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertDispute)
}

// Get disputes by status
export const getDisputesByStatus = async (status: Dispute["status"]): Promise<Dispute[]> => {
  const disputesRef = collection(db, COLLECTIONS.DISPUTES)
  const q = query(disputesRef, where("status", "==", status))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertDispute)
}

// Get disputes by priority
export const getDisputesByPriority = async (priority: Dispute["priority"]): Promise<Dispute[]> => {
  const disputesRef = collection(db, COLLECTIONS.DISPUTES)
  const q = query(disputesRef, where("priority", "==", priority))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertDispute)
}

// Create dispute
export const createDispute = async (
  disputeData: Omit<Dispute, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const disputesRef = collection(db, COLLECTIONS.DISPUTES)
  const docRef = await addDoc(disputesRef, {
    ...disputeData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

// Update dispute
export const updateDispute = async (
  id: string,
  disputeData: Partial<Dispute>
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DISPUTES, id)
  await updateDoc(docRef, {
    ...disputeData,
    updatedAt: serverTimestamp(),
  })
}

// Update dispute status
export const updateDisputeStatus = async (
  id: string,
  status: Dispute["status"]
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DISPUTES, id)
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  })
}

// Resolve dispute
export const resolveDispute = async (
  id: string,
  resolution: string,
  resolverEmail: string
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DISPUTES, id)
  await updateDoc(docRef, {
    status: "resolved",
    resolution,
    resolvedBy: resolverEmail,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// Close dispute
export const closeDispute = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DISPUTES, id)
  await updateDoc(docRef, {
    status: "closed",
    updatedAt: serverTimestamp(),
  })
}

// Delete dispute
export const deleteDispute = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DISPUTES, id)
  await deleteDoc(docRef)
}

// Subscribe to disputes (real-time updates)
export const subscribeToDisputes = (
  callback: (disputes: Dispute[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const disputesRef = collection(db, COLLECTIONS.DISPUTES)
  const q = query(disputesRef, orderBy("createdAt", "desc"))
  
  return onSnapshot(
    q,
    (snapshot) => {
      const disputes = snapshot.docs.map(convertDispute)
      callback(disputes)
    },
    (error) => {
      console.error("Error subscribing to disputes:", error)
      onError?.(error)
    }
  )
}

// Subscribe to open disputes
export const subscribeToOpenDisputes = (
  callback: (disputes: Dispute[]) => void
): Unsubscribe => {
  const disputesRef = collection(db, COLLECTIONS.DISPUTES)
  const q = query(
    disputesRef,
    where("status", "in", ["open", "investigating"]),
    orderBy("createdAt", "desc")
  )
  
  return onSnapshot(q, (snapshot) => {
    const disputes = snapshot.docs.map(convertDispute)
    callback(disputes)
  })
}

// Get dispute statistics
export const getDisputeStats = async () => {
  const disputes = await getDisputes()
  
  return {
    total: disputes.length,
    open: disputes.filter((d) => d.status === "open").length,
    investigating: disputes.filter((d) => d.status === "investigating").length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
    closed: disputes.filter((d) => d.status === "closed").length,
    totalAmount: disputes.reduce((sum, d) => sum + d.amount, 0),
    highPriority: disputes.filter((d) => d.priority === "high" && d.status !== "resolved").length,
  }
}
