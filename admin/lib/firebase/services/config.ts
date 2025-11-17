import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"

// Config types
export interface PlatformSettings {
  maintenanceMode: boolean
  allowNewRegistrations: boolean
  requireEmailVerification: boolean
  maxOrdersPerDay: number
}

export interface DeliverySettings {
  minOrderValue: number
  deliveryFee: number
  freeDeliveryThreshold: number
  maxDeliveryRadius: number
}

export interface PaymentSettings {
  acceptedMethods: string[]
  currency: string
  taxRate: number
}

export interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
}

export interface AppConfig {
  platformSettings: PlatformSettings
  deliverySettings: DeliverySettings
  paymentSettings: PaymentSettings
  featureFlags: FeatureFlag[]
  updatedAt?: string
}

// Default configuration
const defaultConfig: AppConfig = {
  platformSettings: {
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    maxOrdersPerDay: 50,
  },
  deliverySettings: {
    minOrderValue: 10.0,
    deliveryFee: 4.99,
    freeDeliveryThreshold: 25.0,
    maxDeliveryRadius: 10,
  },
  paymentSettings: {
    acceptedMethods: ["card", "apple_pay", "google_pay"],
    currency: "USD",
    taxRate: 0.08,
  },
  featureFlags: [
    {
      id: "new-checkout",
      name: "New Checkout Flow",
      description: "Enable the redesigned checkout experience with one-click payments",
      enabled: true,
    },
    {
      id: "driver-ratings",
      name: "Driver Ratings",
      description: "Allow customers to rate drivers after delivery",
      enabled: true,
    },
    {
      id: "live-tracking",
      name: "Live Order Tracking",
      description: "Enable real-time GPS tracking for deliveries",
      enabled: false,
    },
    {
      id: "promo-codes",
      name: "Promotional Codes",
      description: "Enable discount and promotional code functionality",
      enabled: true,
    },
    {
      id: "subscription",
      name: "Subscription Service",
      description: "Beta feature for recurring delivery subscriptions",
      enabled: false,
    },
  ],
}

// Get app configuration
export const getAppConfig = async (): Promise<AppConfig> => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  const docSnap = await getDoc(docRef)
  
  if (docSnap.exists()) {
    return docSnap.data() as AppConfig
  }
  
  // Return default config if not found
  return defaultConfig
}

// Initialize config if not exists
export const initializeConfig = async (): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    await setDoc(docRef, {
      ...defaultConfig,
      createdAt: serverTimestamp(),
    })
  }
}

// Update platform settings
export const updatePlatformSettings = async (
  settings: Partial<PlatformSettings>
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  const config = await getAppConfig()
  
  await updateDoc(docRef, {
    platformSettings: { ...config.platformSettings, ...settings },
    updatedAt: serverTimestamp(),
  })
}

// Update delivery settings
export const updateDeliverySettings = async (
  settings: Partial<DeliverySettings>
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  const config = await getAppConfig()
  
  await updateDoc(docRef, {
    deliverySettings: { ...config.deliverySettings, ...settings },
    updatedAt: serverTimestamp(),
  })
}

// Update payment settings
export const updatePaymentSettings = async (
  settings: Partial<PaymentSettings>
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  const config = await getAppConfig()
  
  await updateDoc(docRef, {
    paymentSettings: { ...config.paymentSettings, ...settings },
    updatedAt: serverTimestamp(),
  })
}

// Update feature flags
export const updateFeatureFlags = async (flags: FeatureFlag[]): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  
  await updateDoc(docRef, {
    featureFlags: flags,
    updatedAt: serverTimestamp(),
  })
}

// Toggle single feature flag
export const toggleFeatureFlag = async (flagId: string): Promise<void> => {
  const config = await getAppConfig()
  const updatedFlags = config.featureFlags.map((flag) =>
    flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
  )
  
  await updateFeatureFlags(updatedFlags)
}

// Update entire config
export const updateAppConfig = async (config: Partial<AppConfig>): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  
  await updateDoc(docRef, {
    ...config,
    updatedAt: serverTimestamp(),
  })
}

// Subscribe to config changes (real-time updates)
export const subscribeToConfig = (
  callback: (config: AppConfig) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const docRef = doc(db, COLLECTIONS.CONFIG, "app")
  
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as AppConfig)
      } else {
        callback(defaultConfig)
      }
    },
    (error) => {
      console.error("Error subscribing to config:", error)
      onError?.(error)
    }
  )
}
