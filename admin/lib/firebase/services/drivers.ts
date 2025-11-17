import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type { Driver, DriverLocation, DriverStatus } from "@/lib/types"

const convertDriver = (snapshot: any): Driver => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    status: data.status || "offline",
    vehicleType: data.vehicleType || "bike",
    lastSeenAt: data.lastSeenAt instanceof Timestamp ? data.lastSeenAt.toDate().toISOString() : data.lastSeenAt,
    avatar: data.avatar,
    rating: data.rating,
    completedDeliveries: data.completedDeliveries,
    currentOrderId: data.currentOrderId ?? null,
    location: data.location
      ? {
          lat: data.location.lat,
          lng: data.location.lng,
          heading: data.location.heading,
          speed: data.location.speed,
          updatedAt:
            data.location.updatedAt instanceof Timestamp
              ? data.location.updatedAt.toDate().toISOString()
              : data.location.updatedAt,
        }
      : undefined,
  }
}

export const subscribeToDrivers = (
  callback: (drivers: Driver[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const driversRef = collection(db, COLLECTIONS.DRIVERS)
  const q = query(driversRef, orderBy("lastSeenAt", "desc"))

  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(convertDriver)),
    (error) => {
      console.error("Error subscribing to drivers", error)
      onError?.(error as Error)
    },
  )
}

export const createDriver = async (
  driver: Omit<Driver, "id" | "lastSeenAt"> & { lastSeenAt?: string },
): Promise<string> => {
  const driversRef = collection(db, COLLECTIONS.DRIVERS)
  const docRef = await addDoc(driversRef, {
    ...driver,
    lastSeenAt: driver.lastSeenAt ? new Date(driver.lastSeenAt) : serverTimestamp(),
    location: driver.location
      ? {
          ...driver.location,
          updatedAt: driver.location.updatedAt ? new Date(driver.location.updatedAt) : serverTimestamp(),
        }
      : null,
  })
  return docRef.id
}

export const updateDriverStatus = async (id: string, status: DriverStatus): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DRIVERS, id)
  await updateDoc(docRef, {
    status,
    lastSeenAt: serverTimestamp(),
  })
}

export const updateDriverLocation = async (id: string, location: DriverLocation): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DRIVERS, id)
  await updateDoc(docRef, {
    location: {
      ...location,
      updatedAt: new Date(location.updatedAt ?? new Date().toISOString()),
    },
    lastSeenAt: serverTimestamp(),
  })
}

export const assignDriverToOrder = async (
  driverId: string,
  orderId: string,
  metadata?: { driverName?: string },
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DRIVERS, driverId)
  await updateDoc(docRef, {
    currentOrderId: orderId,
    status: "busy",
    lastSeenAt: serverTimestamp(),
  })

  if (metadata?.driverName) {
    console.info(`Driver ${metadata.driverName} assigned to order ${orderId}`)
  }
}

export const releaseDriver = async (driverId: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DRIVERS, driverId)
  await updateDoc(docRef, {
    currentOrderId: null,
    status: "online",
    lastSeenAt: serverTimestamp(),
  })
}
