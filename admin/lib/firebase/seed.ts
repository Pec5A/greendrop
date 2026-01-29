/**
 * Firebase Seed Script
 * 
 * This script seeds the Firebase database with initial mock data.
 * Run this script once after setting up your Firebase project.
 * 
 * Usage:
 * 1. Make sure your .env.local file is configured
 * 2. Run: npx ts-node scripts/seed-firebase.ts
 * 
 * Or import and call from browser console (for development only):
 * import { seedDatabase } from '@/lib/firebase/seed'
 * seedDatabase()
 */

import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "./config"
import { COLLECTIONS } from "./collections"

// Mock data
const mockUsers = [
  {
    email: "john.doe@example.com",
    name: "John Doe",
    role: "user",
    status: "verified",
    phone: "+1 (555) 123-4567",
  },
  {
    email: "jane.smith@example.com",
    name: "Jane Smith",
    role: "driver",
    status: "pending",
    phone: "+1 (555) 234-5678",
  },
  {
    email: "bob.wilson@example.com",
    name: "Bob Wilson",
    role: "user",
    status: "verified",
    phone: "+1 (555) 345-6789",
  },
  {
    email: "alice.brown@example.com",
    name: "Alice Brown",
    role: "admin",
    status: "verified",
    phone: "+1 (555) 456-7890",
  },
  {
    email: "charlie.davis@example.com",
    name: "Charlie Davis",
    role: "user",
    status: "rejected",
    phone: "+1 (555) 567-8901",
  },
]

const mockOrders = [
  {
    userId: "1",
    shopId: "SHOP-001",
    status: "delivered",
    total: 45.99,
    items: [
      { id: "1", productId: "P1", productName: "Product A", quantity: 2, price: 15.99 },
      { id: "2", productId: "P2", productName: "Product B", quantity: 1, price: 14.01 },
    ],
  },
  {
    userId: "2",
    shopId: "SHOP-002",
    status: "shipped",
    total: 89.5,
    items: [{ id: "3", productId: "P3", productName: "Product C", quantity: 3, price: 29.83 }],
  },
  {
    userId: "3",
    shopId: "SHOP-001",
    status: "paid",
    total: 125.0,
    items: [{ id: "4", productId: "P4", productName: "Product D", quantity: 5, price: 25.0 }],
  },
]

const mockVerifications = [
  {
    userId: "2",
    type: "license",
    status: "pending",
    documentUrl: "/generic-identification-card.png",
  },
  {
    userId: "5",
    type: "id",
    status: "pending",
    documentUrl: "/generic-government-id.png",
  },
  {
    userId: "1",
    type: "id",
    status: "approved",
    documentUrl: "/open-passport-stamps.png",
    reviewedBy: "admin@greendrop.com",
  },
]

const mockDisputes = [
  {
    orderId: "ORD-001",
    userId: "1",
    userName: "John Doe",
    userEmail: "john.doe@example.com",
    reason: "Item not received",
    description: "Je n'ai pas reçu ma commande après 2 semaines.",
    status: "open",
    priority: "high",
    amount: 45.99,
  },
  {
    orderId: "ORD-002",
    userId: "3",
    userName: "Bob Wilson",
    userEmail: "bob.wilson@example.com",
    reason: "Damaged product",
    description: "Le produit est arrivé cassé.",
    status: "investigating",
    priority: "medium",
    amount: 89.5,
  },
  {
    orderId: "ORD-003",
    userId: "2",
    userName: "Jane Smith",
    userEmail: "jane.smith@example.com",
    reason: "Wrong item delivered",
    description: "J'ai reçu un article différent.",
    status: "open",
    priority: "medium",
    amount: 125.0,
  },
]

const mockLegalZones = [
  {
    name: "Zone de Livraison Centre-Ville",
    type: "delivery",
    coordinates: [
      { x: 150, y: 150 },
      { x: 350, y: 150 },
      { x: 350, y: 300 },
      { x: 150, y: 300 },
    ],
    color: "#10b981",
    active: true,
  },
  {
    name: "Zone Restreinte Aéroport",
    type: "restricted",
    coordinates: [
      { x: 450, y: 200 },
      { x: 600, y: 200 },
      { x: 600, y: 350 },
      { x: 450, y: 350 },
    ],
    color: "#ef4444",
    active: true,
  },
]

const defaultConfig = {
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
      description: "Enable the redesigned checkout experience",
      enabled: true,
    },
    {
      id: "driver-ratings",
      name: "Driver Ratings",
      description: "Allow customers to rate drivers",
      enabled: true,
    },
    {
      id: "live-tracking",
      name: "Live Order Tracking",
      description: "Enable real-time GPS tracking",
      enabled: false,
    },
    {
      id: "promo-codes",
      name: "Promotional Codes",
      description: "Enable discount codes",
      enabled: true,
    },
    {
      id: "subscription",
      name: "Subscription Service",
      description: "Beta feature for subscriptions",
      enabled: false,
    },
  ],
}

export async function seedDatabase() {
  console.log("🌱 Starting database seed...")

  try {
    // Seed Users
    console.log("📝 Seeding users...")
    for (const user of mockUsers) {
      await addDoc(collection(db, COLLECTIONS.USERS), {
        ...user,
        createdAt: serverTimestamp(),
      })
    }
    console.log(`✅ Created ${mockUsers.length} users`)

    // Seed Orders
    console.log("📝 Seeding orders...")
    for (const order of mockOrders) {
      await addDoc(collection(db, COLLECTIONS.ORDERS), {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    console.log(`✅ Created ${mockOrders.length} orders`)

    // Seed Verifications
    console.log("📝 Seeding verifications...")
    for (const verification of mockVerifications) {
      await addDoc(collection(db, COLLECTIONS.VERIFICATIONS), {
        ...verification,
        submittedAt: serverTimestamp(),
        ...(verification.status === "approved" && {
          reviewedAt: serverTimestamp(),
        }),
      })
    }
    console.log(`✅ Created ${mockVerifications.length} verifications`)

    // Seed Disputes
    console.log("📝 Seeding disputes...")
    for (const dispute of mockDisputes) {
      await addDoc(collection(db, COLLECTIONS.DISPUTES), {
        ...dispute,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    console.log(`✅ Created ${mockDisputes.length} disputes`)

    // Seed Legal Zones
    console.log("📝 Seeding legal zones...")
    for (const zone of mockLegalZones) {
      await addDoc(collection(db, COLLECTIONS.LEGAL_ZONES), {
        ...zone,
        createdAt: serverTimestamp(),
      })
    }
    console.log(`✅ Created ${mockLegalZones.length} legal zones`)

    // Seed Config
    console.log("📝 Seeding app config...")
    await setDoc(doc(db, COLLECTIONS.CONFIG, "app"), {
      ...defaultConfig,
      createdAt: serverTimestamp(),
    })
    console.log("✅ Created app config")

    console.log("🎉 Database seed completed successfully!")
    return { success: true }
  } catch (error) {
    console.error("❌ Error seeding database:", error)
    return { success: false, error }
  }
}

// Export for use in development
export default seedDatabase
