import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type { Shop } from "@/lib/types"

const convertShop = (snapshot: any): Shop => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: data.name,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    status: data.status || "active",
    address: data.address,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    logoUrl: data.logoUrl,
    categories: data.categories || [],
    rating: data.rating,
    totalOrders: data.totalOrders,
    totalProducts: data.totalProducts,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
  }
}

export const subscribeToShops = (
  callback: (shops: Shop[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const shopsRef = collection(db, COLLECTIONS.SHOPS)
  const q = query(shopsRef, orderBy("createdAt", "desc"))

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map(convertShop))
    },
    (error) => {
      console.error("Error subscribing to shops", error)
      onError?.(error as Error)
    },
  )
}

export const getShops = async () => {
  const snapshot = await getDocs(collection(db, COLLECTIONS.SHOPS))
  return snapshot.docs.map(convertShop)
}

export const getShopById = async (id: string): Promise<Shop | null> => {
  const docRef = doc(db, COLLECTIONS.SHOPS, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return convertShop(docSnap)
}

export const createShop = async (
  shop: Omit<Shop, "id" | "createdAt" | "totalOrders" | "totalProducts"> & {
    totalOrders?: number
    totalProducts?: number
  },
): Promise<string> => {
  const shopsRef = collection(db, COLLECTIONS.SHOPS)
  const docRef = await addDoc(shopsRef, {
    ...shop,
    totalOrders: shop.totalOrders ?? 0,
    totalProducts: shop.totalProducts ?? 0,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export const updateShop = async (id: string, data: Partial<Omit<Shop, "id">>): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.SHOPS, id)
  await updateDoc(docRef, data)
}

export const suspendShop = async (id: string): Promise<void> => {
  await updateShop(id, { status: "suspended" })
}
