/**
 * Seed Script for PEC5A - GreenDrop CBD Paris
 *
 * This script populates Firestore with CBD shop demo data for Paris
 *
 * Run: pnpm seed
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env or .env.local
config({ path: resolve(__dirname, "../.env.local") })
config({ path: resolve(__dirname, "../.env") })

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Support both FIREBASE_ADMIN_* and FIREBASE_* variable names
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n")

console.log("Checking environment variables...")
console.log("Project ID:", projectId)
console.log("Client Email:", clientEmail)
console.log("Private Key exists:", !!privateKey)
console.log("Private Key length:", privateKey?.length || 0)

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials!")
  console.error("Please set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env")
  process.exit(1)
}

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

const db = getFirestore()
const auth = getAuth()

// Demo data
const DEMO_USERS = [
  {
    email: "admin@greendrop.com",
    password: "admin123",
    name: "Admin Principal",
    role: "admin",
    status: "verified",
    phone: "+33 6 12 34 56 78",
    avatar: "https://i.pravatar.cc/150?u=admin",
  },
  {
    email: "merchant1@pec5a.com",
    password: "merchant123",
    name: "Pierre Dubois",
    role: "merchant",
    status: "verified",
    phone: "+33 6 23 45 67 89",
    avatar: "https://i.pravatar.cc/150?u=merchant1",
  },
  {
    email: "merchant2@pec5a.com",
    password: "merchant123",
    name: "Sophie Martin",
    role: "merchant",
    status: "verified",
    phone: "+33 6 34 56 78 90",
    avatar: "https://i.pravatar.cc/150?u=merchant2",
  },
  {
    email: "driver1@pec5a.com",
    password: "driver123",
    name: "Thomas Bernard",
    role: "driver",
    status: "verified",
    phone: "+33 6 45 67 89 01",
    avatar: "https://i.pravatar.cc/150?u=driver1",
  },
  {
    email: "driver2@pec5a.com",
    password: "driver123",
    name: "Lucas Petit",
    role: "driver",
    status: "verified",
    phone: "+33 6 56 78 90 12",
    avatar: "https://i.pravatar.cc/150?u=driver2",
  },
  {
    email: "client1@pec5a.com",
    password: "client123",
    name: "Marie Lefebvre",
    role: "user",
    status: "verified",
    phone: "+33 6 67 89 01 23",
    avatar: "https://i.pravatar.cc/150?u=client1",
  },
  {
    email: "client2@pec5a.com",
    password: "client123",
    name: "Antoine Moreau",
    role: "user",
    status: "verified",
    phone: "+33 6 78 90 12 34",
    avatar: "https://i.pravatar.cc/150?u=client2",
  },
]

const DEMO_SHOPS = [
  {
    ownerId: "", // Will be set dynamically
    name: "GreenLeaf Paris",
    ownerName: "Pierre Dubois",
    description: "CBD premium au coeur du 11eme. Fleurs, huiles et accessoires de qualite.",
    status: "active",
    approvalStatus: "approved",
    address: "11 Rue Pierre Levée, 75011 Paris",
    contactEmail: "contact@greenleaf-paris.fr",
    contactPhone: "+33 1 42 60 12 34",
    category: "cbd",
    categories: ["Fleurs CBD", "Huiles CBD"],
    location: { latitude: 48.8658, longitude: 2.3649 },
    deliveryFee: 2.99,
    minOrderAmount: 15.0,
    estimatedDeliveryTime: "20-30 min",
    rating: 4.8,
    totalOrders: 312,
    totalProducts: 0,
    imageURL: "https://images.unsplash.com/photo-1616690710400-a16d146927c5?w=600",
    logoUrl: "https://images.unsplash.com/photo-1616690710400-a16d146927c5?w=600",
  },
  {
    ownerId: "",
    name: "Le Chanvre Dore",
    ownerName: "Sophie Martin",
    description: "Boutique artisanale CBD pres de Republique. Resines, infusions et fleurs selectionnees.",
    status: "active",
    approvalStatus: "approved",
    address: "25 Rue du Faubourg du Temple, 75010 Paris",
    contactEmail: "contact@chanvre-dore.fr",
    contactPhone: "+33 1 48 87 23 45",
    category: "cbd",
    categories: ["Resines CBD", "Infusions", "Fleurs CBD"],
    location: { latitude: 48.8683, longitude: 2.3648 },
    deliveryFee: 1.99,
    minOrderAmount: 10.0,
    estimatedDeliveryTime: "15-25 min",
    rating: 4.6,
    totalOrders: 245,
    totalProducts: 0,
    imageURL: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600",
    logoUrl: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=600",
  },
  {
    ownerId: "",
    name: "CBD Factory Oberkampf",
    ownerName: "Pierre Dubois",
    description: "Le plus grand choix de CBD a Oberkampf. Cosmetiques, e-liquides et fleurs.",
    status: "active",
    approvalStatus: "approved",
    address: "78 Rue Oberkampf, 75011 Paris",
    contactEmail: "contact@cbdfactory.fr",
    contactPhone: "+33 1 43 55 34 56",
    category: "cbd",
    categories: ["Cosmetiques CBD", "Accessoires", "Fleurs CBD"],
    location: { latitude: 48.8651, longitude: 2.3781 },
    deliveryFee: 2.49,
    minOrderAmount: 12.0,
    estimatedDeliveryTime: "20-35 min",
    rating: 4.5,
    totalOrders: 189,
    totalProducts: 0,
    imageURL: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?w=600",
    logoUrl: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?w=600",
  },
  {
    ownerId: "",
    name: "Herbal House Belleville",
    ownerName: "Sophie Martin",
    description: "CBD bio et bien-etre a Belleville. Huiles, tisanes et soins naturels.",
    status: "active",
    approvalStatus: "approved",
    address: "3 Rue Denoyez, 75020 Paris",
    contactEmail: "contact@herbalhouse.fr",
    contactPhone: "+33 1 46 06 45 67",
    category: "cbd",
    categories: ["Huiles CBD", "Infusions", "Cosmetiques CBD"],
    location: { latitude: 48.8716, longitude: 2.3802 },
    deliveryFee: 2.99,
    minOrderAmount: 15.0,
    estimatedDeliveryTime: "25-35 min",
    rating: 4.7,
    totalOrders: 156,
    totalProducts: 0,
    imageURL: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600",
    logoUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600",
  },
]

const DEMO_PRODUCTS = [
  // GreenLeaf Paris
  {
    shopId: "",
    shopName: "GreenLeaf Paris",
    name: "Amnesia Haze CBD",
    description: "Fleur CBD premium aux aromes citronnees et terreuses. Taux CBD 12%. Culture indoor.",
    sku: "GL-FLC-001",
    category: "Fleurs CBD",
    tags: ["fleur", "indoor", "premium"],
    price: 8.5,
    stock: 80,
    minStock: 10,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400",
  },
  {
    shopId: "",
    shopName: "GreenLeaf Paris",
    name: "OG Kush CBD",
    description: "Classique indica aux notes boisees et epicees. Taux CBD 15%. Culture greenhouse.",
    sku: "GL-FLC-002",
    category: "Fleurs CBD",
    tags: ["fleur", "greenhouse", "indica"],
    price: 9.0,
    stock: 60,
    minStock: 10,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400",
  },
  {
    shopId: "",
    shopName: "GreenLeaf Paris",
    name: "Huile CBD 10% Full Spectrum",
    description: "Huile CBD full spectrum 10% (1000mg). Pipette doseuse. Extraction CO2.",
    sku: "GL-HUI-001",
    category: "Huiles CBD",
    tags: ["huile", "full-spectrum", "bien-etre"],
    price: 29.9,
    stock: 40,
    minStock: 5,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?w=400",
  },
  {
    shopId: "",
    shopName: "GreenLeaf Paris",
    name: "Huile CBD 20%",
    description: "Huile CBD concentree 20% (2000mg). Ideal pour les utilisateurs experimentes.",
    sku: "GL-HUI-002",
    category: "Huiles CBD",
    tags: ["huile", "concentre", "premium"],
    price: 49.9,
    stock: 25,
    minStock: 5,
    status: "active",
    featured: false,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?w=400",
  },
  // Le Chanvre Dore
  {
    shopId: "",
    shopName: "Le Chanvre Dore",
    name: "Resine CBD Afghan",
    description: "Resine CBD tradition afghane. Texture souple, arome puissant. Taux CBD 22%.",
    sku: "LCD-RES-001",
    category: "Resines CBD",
    tags: ["resine", "afghan", "puissant"],
    price: 7.5,
    stock: 50,
    minStock: 10,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400",
  },
  {
    shopId: "",
    shopName: "Le Chanvre Dore",
    name: "Infusion Chanvre & Camomille",
    description: "Melange relaxant chanvre bio et camomille. 20 sachets. Ideal le soir.",
    sku: "LCD-INF-001",
    category: "Infusions",
    tags: ["infusion", "bio", "relaxation"],
    price: 12.9,
    stock: 60,
    minStock: 10,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
  },
  {
    shopId: "",
    shopName: "Le Chanvre Dore",
    name: "Lemon Haze CBD",
    description: "Fleur sativa CBD aux notes vives de citron. Taux CBD 10%. Culture outdoor.",
    sku: "LCD-FLC-001",
    category: "Fleurs CBD",
    tags: ["fleur", "outdoor", "sativa"],
    price: 7.9,
    stock: 70,
    minStock: 10,
    status: "active",
    featured: false,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400",
  },
  // CBD Factory Bastille
  {
    shopId: "",
    shopName: "CBD Factory Bastille",
    name: "Baume CBD Anti-douleur",
    description: "Baume CBD 500mg au menthol et arnica. Application locale pour douleurs musculaires.",
    sku: "CBF-COS-001",
    category: "Cosmetiques CBD",
    tags: ["cosmetique", "baume", "anti-douleur"],
    price: 24.9,
    stock: 35,
    minStock: 5,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1556228578-dd539282b964?w=400",
  },
  {
    shopId: "",
    shopName: "CBD Factory Bastille",
    name: "E-liquide CBD Menthe",
    description: "E-liquide CBD 300mg saveur menthe glaciale. Compatible toutes cigarettes electroniques.",
    sku: "CBF-ACC-001",
    category: "Accessoires",
    tags: ["e-liquide", "vape", "menthe"],
    price: 14.9,
    stock: 45,
    minStock: 10,
    status: "active",
    featured: false,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1560913210-89321c2e8bef?w=400",
  },
  {
    shopId: "",
    shopName: "CBD Factory Bastille",
    name: "Purple Haze CBD",
    description: "Fleur CBD aux reflets violets et notes fruitees. Taux CBD 8%. Culture indoor.",
    sku: "CBF-FLC-001",
    category: "Fleurs CBD",
    tags: ["fleur", "indoor", "fruity"],
    price: 6.9,
    stock: 90,
    minStock: 15,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400",
  },
  // Herbal House Montmartre
  {
    shopId: "",
    shopName: "Herbal House Montmartre",
    name: "Huile CBD Sommeil 15%",
    description: "Huile CBD 15% enrichie en melatonine et lavande. Favorise un sommeil reparateur.",
    sku: "HHM-HUI-001",
    category: "Huiles CBD",
    tags: ["huile", "sommeil", "melatonine"],
    price: 39.9,
    stock: 30,
    minStock: 5,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?w=400",
  },
  {
    shopId: "",
    shopName: "Herbal House Montmartre",
    name: "Tisane CBD Detox",
    description: "Tisane detox au chanvre, mate et gingembre. 15 sachets. Boost naturel.",
    sku: "HHM-INF-001",
    category: "Infusions",
    tags: ["tisane", "detox", "energie"],
    price: 14.9,
    stock: 45,
    minStock: 10,
    status: "active",
    featured: false,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
  },
  {
    shopId: "",
    shopName: "Herbal House Montmartre",
    name: "Creme Visage CBD",
    description: "Creme hydratante visage au CBD et acide hyaluronique. 50ml. Tous types de peau.",
    sku: "HHM-COS-001",
    category: "Cosmetiques CBD",
    tags: ["cosmetique", "visage", "hydratant"],
    price: 32.9,
    stock: 20,
    minStock: 5,
    status: "active",
    featured: true,
    isRestricted: true,
    minimumAge: 18,
    imageUrl: "https://images.unsplash.com/photo-1556228578-dd539282b964?w=400",
  },
]

const DEMO_DRIVERS = [
  {
    id: "",
    name: "Thomas Bernard",
    email: "driver1@pec5a.com",
    phone: "+33 6 45 67 89 01",
    status: "online",
    vehicleType: "moto",
    vehiclePlate: "AB-123-CD",
    rating: 4.8,
    completedDeliveries: 342,
    location: {
      lat: 48.8566,
      lng: 2.3522,
      updatedAt: new Date().toISOString(),
    },
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: "",
    name: "Lucas Petit",
    email: "driver2@pec5a.com",
    phone: "+33 6 56 78 90 12",
    status: "busy",
    vehicleType: "voiture",
    vehiclePlate: "EF-456-GH",
    rating: 4.6,
    completedDeliveries: 267,
    location: {
      lat: 48.8606,
      lng: 2.3376,
      updatedAt: new Date().toISOString(),
    },
    lastSeenAt: new Date().toISOString(),
  },
]

const DEMO_ORDERS: any[] = [
  {
    userId: "",
    shopId: "",
    shopName: "GreenLeaf Paris",
    shopAddress: "11 Rue Pierre Levée, 75011 Paris",
    shopLocation: { latitude: 48.8658, longitude: 2.3649 },
    status: "delivered",
    priority: "normal",
    reference: "ORD-2025-001",
    subtotal: 47.4,
    deliveryFee: 2.99,
    total: 50.39,
    currency: "EUR",
    driverId: "",
    driverName: "Thomas Bernard",
    driverPhone: "+33 6 45 67 89 01",
    deliveryAddress: "42 Rue de la Fontaine au Roi, 75011 Paris",
    deliveryLocation: { latitude: 48.8679, longitude: 2.3707 },
    expectedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: "card",
    paymentStatus: "paid",
    items: [
      { productId: "p1", productName: "Amnesia Haze CBD", price: 8.5, quantity: 2 },
      { productId: "p2", productName: "Huile CBD 10% Full Spectrum", price: 29.9, quantity: 1 },
    ],
  },
  {
    userId: "",
    shopId: "",
    shopName: "Le Chanvre Dore",
    shopAddress: "25 Rue du Faubourg du Temple, 75010 Paris",
    shopLocation: { latitude: 48.8683, longitude: 2.3648 },
    status: "delivering",
    priority: "high",
    reference: "ORD-2025-002",
    subtotal: 28.3,
    deliveryFee: 1.99,
    total: 30.29,
    currency: "EUR",
    driverId: "",
    driverName: "Lucas Petit",
    driverPhone: "+33 6 56 78 90 12",
    deliveryAddress: "15 Rue Jean-Pierre Timbaud, 75011 Paris",
    deliveryLocation: { latitude: 48.8648, longitude: 2.3722 },
    expectedDelivery: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    paymentMethod: "card",
    paymentStatus: "paid",
    items: [
      { productId: "p5", productName: "Resine CBD Afghan", price: 7.5, quantity: 2 },
      { productId: "p6", productName: "Infusion Chanvre & Camomille", price: 12.9, quantity: 1 },
    ],
  },
  {
    userId: "",
    shopId: "",
    shopName: "CBD Factory Oberkampf",
    shopAddress: "78 Rue Oberkampf, 75011 Paris",
    shopLocation: { latitude: 48.8651, longitude: 2.3781 },
    status: "pending",
    priority: "normal",
    reference: "ORD-2025-003",
    subtotal: 46.7,
    deliveryFee: 2.49,
    total: 49.19,
    currency: "EUR",
    driverId: null,
    deliveryAddress: "5 Rue de Belleville, 75019 Paris",
    deliveryLocation: { latitude: 48.8724, longitude: 2.3769 },
    expectedDelivery: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    paymentMethod: "card",
    paymentStatus: "paid",
    items: [
      { productId: "p8", productName: "Baume CBD Anti-douleur", price: 24.9, quantity: 1 },
      { productId: "p9", productName: "E-liquide CBD Menthe", price: 14.9, quantity: 1 },
      { productId: "p10", productName: "Purple Haze CBD", price: 6.9, quantity: 1 },
    ],
  },
]

async function clearCollection(collectionName: string) {
  console.log(`Clearing ${collectionName}...`)
  const snapshot = await db.collection(collectionName).get()
  const batchSize = 500
  const docs = snapshot.docs

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch()
    docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
  }

  console.log(`Cleared ${snapshot.size} documents from ${collectionName}`)
}

async function seedUsers() {
  console.log("\nCreating users...")

  const userIds: Record<string, string> = {}

  for (const userData of DEMO_USERS) {
    try {
      // Create auth user
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
        emailVerified: true,
      })

      userIds[userData.email] = userRecord.uid

      // Create Firestore profile
      await db.collection("users").doc(userRecord.uid).set({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        phone: userData.phone,
        avatar: userData.avatar,
        createdAt: Timestamp.now(),
      })

      console.log(`Created user: ${userData.name} (${userData.role})`)
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        const existingUser = await auth.getUserByEmail(userData.email)
        userIds[userData.email] = existingUser.uid
        console.log(`User already exists: ${userData.email}`)
      } else {
        console.error(`Error creating user ${userData.email}:`, error.message)
      }
    }
  }

  return userIds
}

async function seedShops(userIds: Record<string, string>) {
  console.log("\nCreating CBD shops...")

  const shopIds: string[] = []
  const shopNameToId: Record<string, string> = {}

  for (const shopData of DEMO_SHOPS) {
    const ownerEmail = shopData.ownerName === "Pierre Dubois" ? "merchant1@pec5a.com" : "merchant2@pec5a.com"

    const shopDoc = await db.collection("shops").add({
      ...shopData,
      ownerId: userIds[ownerEmail],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    shopIds.push(shopDoc.id)
    shopNameToId[shopData.name] = shopDoc.id
    console.log(`Created shop: ${shopData.name} (${shopDoc.id})`)

    // Write shopId back to the merchant user document (first shop only per merchant)
    const merchantUid = userIds[ownerEmail]
    if (merchantUid) {
      const userDoc = await db.collection("users").doc(merchantUid).get()
      if (userDoc.exists && !userDoc.data()?.shopId) {
        await db.collection("users").doc(merchantUid).update({
          shopId: shopDoc.id,
        })
        console.log(`  -> Linked shop ${shopDoc.id} to user ${ownerEmail}`)
      }
    }
  }

  return { shopIds, shopNameToId }
}

async function seedProducts(shopNameToId: Record<string, string>) {
  console.log("\nCreating CBD products...")

  for (const productData of DEMO_PRODUCTS) {
    const shopId = shopNameToId[productData.shopName]
    if (!shopId) {
      console.error(`Shop not found for product: ${productData.name}`)
      continue
    }

    await db.collection("products").add({
      ...productData,
      shopId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    console.log(`Created product: ${productData.name} (${productData.shopName})`)
  }

  // Update shop product counts
  for (const [shopName, shopId] of Object.entries(shopNameToId)) {
    const productsCount = DEMO_PRODUCTS.filter((p) => p.shopName === shopName).length
    await db.collection("shops").doc(shopId).update({
      totalProducts: productsCount,
    })
  }
}

async function seedDrivers(userIds: Record<string, string>) {
  console.log("\nCreating drivers...")

  const driverIds: string[] = []

  for (const driverData of DEMO_DRIVERS) {
    const driverId = userIds[driverData.email]

    await db
      .collection("drivers")
      .doc(driverId)
      .set({
        ...driverData,
        id: driverId,
        driverId: driverId,
        isAvailable: true,
        createdAt: Timestamp.now(),
      })

    // Update user document with driverId reference
    await db.collection("users").doc(driverId).update({
      driverId: driverId,
    })

    driverIds.push(driverId)
    console.log(`Created driver: ${driverData.name} (${driverId})`)
  }

  return driverIds
}

async function seedOrders(userIds: Record<string, string>, shopNameToId: Record<string, string>, driverIds: string[]) {
  console.log("\nCreating orders...")

  // GreenLeaf Paris - delivered order
  DEMO_ORDERS[0].userId = userIds["client1@pec5a.com"]
  DEMO_ORDERS[0].shopId = shopNameToId["GreenLeaf Paris"]
  DEMO_ORDERS[0].driverId = driverIds[0]

  // Le Chanvre Dore - delivering order
  DEMO_ORDERS[1].userId = userIds["client2@pec5a.com"]
  DEMO_ORDERS[1].shopId = shopNameToId["Le Chanvre Dore"]
  DEMO_ORDERS[1].driverId = driverIds[1]

  // CBD Factory Bastille - pending order
  DEMO_ORDERS[2].userId = userIds["client1@pec5a.com"]
  DEMO_ORDERS[2].shopId = shopNameToId["CBD Factory Bastille"]

  for (const orderData of DEMO_ORDERS) {
    await db.collection("orders").add({
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    console.log(`Created order: ${orderData.reference} (${orderData.shopName})`)
  }
}

async function main() {
  console.log("Starting seed process...\n")

  try {
    // Clear existing data
    await clearCollection("orders")
    await clearCollection("products")
    await clearCollection("shops")
    // Note: not clearing users/drivers to preserve auth accounts

    const userIds = await seedUsers()
    const { shopIds, shopNameToId } = await seedShops(userIds)
    await seedProducts(shopNameToId)
    const driverIds = await seedDrivers(userIds)
    await seedOrders(userIds, shopNameToId, driverIds)

    console.log("\nSeed completed successfully!")
    console.log("\nDemo Credentials:")
    console.log("Admin: admin@greendrop.com / admin123")
    console.log("Merchant 1: merchant1@pec5a.com / merchant123")
    console.log("Merchant 2: merchant2@pec5a.com / merchant123")
    console.log("Driver 1: driver1@pec5a.com / driver123")
    console.log("Driver 2: driver2@pec5a.com / driver123")
    console.log("Client 1: client1@pec5a.com / client123")
    console.log("Client 2: client2@pec5a.com / client123")
    console.log("\nCBD Shops:")
    console.log("- GreenLeaf Paris (1er) - Pierre Dubois")
    console.log("- Le Chanvre Dore (4eme) - Sophie Martin")
    console.log("- CBD Factory Bastille (11eme) - Pierre Dubois")
    console.log("- Herbal House Montmartre (18eme) - Sophie Martin")

    process.exit(0)
  } catch (error) {
    console.error("\nSeed failed:", error)
    process.exit(1)
  }
}

main()
