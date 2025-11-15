import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type { Product } from "@/lib/types"

const convertProduct = (snapshot: any): Product => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    shopId: data.shopId,
    shopName: data.shopName,
    name: data.name,
    description: data.description || "",
    sku: data.sku,
    category: data.category || "general",
    tags: data.tags || [],
    price: data.price,
    stock: data.stock,
    minStock: data.minStock,
    status: data.status || "active",
    imageUrl: data.imageUrl,
    featured: data.featured || false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  }
}

export const subscribeToProducts = (
  callback: (products: Product[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const productsRef = collection(db, COLLECTIONS.PRODUCTS)
  const q = query(productsRef, orderBy("createdAt", "desc"))

  return onSnapshot(
    q,
    (snapshot) => {
      const products = snapshot.docs.map(convertProduct)
      callback(products)
    },
    (error) => {
      console.error("Error subscribing to products", error)
      onError?.(error as Error)
    },
  )
}

export const getProductById = async (id: string): Promise<Product | null> => {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return convertProduct(docSnap)
}

export const getProductsByShop = async (shopId: string): Promise<Product[]> => {
  const productsRef = collection(db, COLLECTIONS.PRODUCTS)
  const q = query(productsRef, where("shopId", "==", shopId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertProduct)
}

export const createProduct = async (
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const productsRef = collection(db, COLLECTIONS.PRODUCTS)
  const docRef = await addDoc(productsRef, {
    ...product,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export const updateProduct = async (
  id: string,
  data: Partial<Omit<Product, "id">>,
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const deleteProduct = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id)
  await deleteDoc(docRef)
}

export const getProductStats = async () => {
  const snapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS))
  const products = snapshot.docs.map(convertProduct)

  return {
    total: products.length,
    active: products.filter((p) => p.status === "active").length,
    draft: products.filter((p) => p.status === "draft").length,
    archived: products.filter((p) => p.status === "archived").length,
    lowStock: products.filter((p) => typeof p.minStock === "number" && p.stock <= (p.minStock ?? 0)).length,
  }
}
