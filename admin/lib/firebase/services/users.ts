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
import type { User } from "@/lib/types"

// Convert Firestore document to User type
const convertUser = (doc: any): User => {
  const data = doc.data()
  return {
    id: doc.id,
    email: data.email,
    name: data.name,
    role: data.role,
    status: data.status,
    createdAt: data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate().toISOString() 
      : data.createdAt,
    phone: data.phone,
    avatar: data.avatar,
  }
}

// Get all users
export const getUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const q = query(usersRef, orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertUser)
}

// Get user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const docRef = doc(db, COLLECTIONS.USERS, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return convertUser(docSnap)
  }
  return null
}

// Get users by status
export const getUsersByStatus = async (status: User["status"]): Promise<User[]> => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const q = query(usersRef, where("status", "==", status))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertUser)
}

// Get users by role
export const getUsersByRole = async (role: User["role"]): Promise<User[]> => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const q = query(usersRef, where("role", "==", role))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertUser)
}

// Create user
export const createUser = async (userData: Omit<User, "id" | "createdAt">): Promise<string> => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const docRef = await addDoc(usersRef, {
    ...userData,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// Update user
export const updateUser = async (id: string, userData: Partial<User>): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.USERS, id)
  await updateDoc(docRef, {
    ...userData,
    updatedAt: serverTimestamp(),
  })
}

// Update user status
export const updateUserStatus = async (id: string, status: User["status"]): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.USERS, id)
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  })
}

// Delete user
export const deleteUser = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.USERS, id)
  await deleteDoc(docRef)
}

// Delete multiple users
export const deleteUsers = async (ids: string[]): Promise<void> => {
  const deletePromises = ids.map((id) => deleteUser(id))
  await Promise.all(deletePromises)
}

// Subscribe to users (real-time updates)
export const subscribeToUsers = (
  callback: (users: User[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const q = query(usersRef, orderBy("createdAt", "desc"))
  
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map(convertUser)
      callback(users)
    },
    (error) => {
      console.error("Error subscribing to users:", error)
      onError?.(error)
    }
  )
}

// Subscribe to users by status (real-time updates)
export const subscribeToUsersByStatus = (
  status: User["status"],
  callback: (users: User[]) => void
): Unsubscribe => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const q = query(usersRef, where("status", "==", status))
  
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(convertUser)
    callback(users)
  })
}
