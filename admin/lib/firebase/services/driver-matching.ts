import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type { Driver } from "@/lib/types"
import { assignDriverToOrder as assignDriver } from "./drivers"
import { assignDriverToOrder as updateOrderDriver } from "./orders"

interface MatchCandidate {
  driver: Driver
  distance: number // km
  score: number    // 0-100
}

/**
 * Haversine formula to calculate distance between two lat/lng points in km
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Score a driver candidate based on multiple criteria:
 * - Distance (closer = higher score, max 50 pts)
 * - Rating (higher = better, max 20 pts)
 * - Completed deliveries (experience, max 15 pts)
 * - Recent activity (last seen, max 15 pts)
 */
function scoreCandidate(driver: Driver, pickupLat: number, pickupLng: number): MatchCandidate | null {
  if (!driver.location) return null

  const distance = haversineDistance(
    driver.location.lat, driver.location.lng,
    pickupLat, pickupLng
  )

  // Reject if beyond 10km
  if (distance > 10) return null

  // Distance score: 50 pts max, linear decay from 0km (50) to 10km (0)
  const distanceScore = Math.max(0, 50 * (1 - distance / 10))

  // Rating score: 20 pts max (rating is 0-5)
  const ratingScore = ((driver.rating ?? 3) / 5) * 20

  // Experience score: 15 pts max (capped at 100 deliveries)
  const deliveries = Math.min(driver.completedDeliveries ?? 0, 100)
  const experienceScore = (deliveries / 100) * 15

  // Recency score: 15 pts max (seen in last 5 min = 15, 30 min = 0)
  const lastSeen = driver.lastSeenAt ? new Date(driver.lastSeenAt).getTime() : 0
  const minutesAgo = (Date.now() - lastSeen) / 60000
  const recencyScore = Math.max(0, 15 * (1 - minutesAgo / 30))

  const score = distanceScore + ratingScore + experienceScore + recencyScore

  return { driver, distance, score }
}

/**
 * Find the best available driver for an order based on pickup location.
 * Returns ranked candidates sorted by score (highest first).
 */
export async function findBestDrivers(
  pickupLat: number,
  pickupLng: number,
  maxResults = 5
): Promise<MatchCandidate[]> {
  // Query only online (available) drivers
  const driversRef = collection(db, COLLECTIONS.DRIVERS)
  const q = query(driversRef, where("status", "==", "online"))
  const snapshot = await getDocs(q)

  const candidates: MatchCandidate[] = []

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    const driver: Driver = {
      id: doc.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status,
      vehicleType: data.vehicleType || "bike",
      lastSeenAt: data.lastSeenAt?.toDate?.()?.toISOString() || data.lastSeenAt,
      rating: data.rating,
      completedDeliveries: data.completedDeliveries,
      currentOrderId: data.currentOrderId ?? null,
      location: data.location ? {
        lat: data.location.lat,
        lng: data.location.lng,
        heading: data.location.heading,
        speed: data.location.speed,
        updatedAt: data.location.updatedAt?.toDate?.()?.toISOString() || data.location.updatedAt,
      } : undefined,
    }

    // Skip drivers already on a delivery
    if (driver.currentOrderId) return

    const candidate = scoreCandidate(driver, pickupLat, pickupLng)
    if (candidate) {
      candidates.push(candidate)
    }
  })

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  return candidates.slice(0, maxResults)
}

/**
 * Auto-assign the best available driver to an order.
 * Returns the assigned driver or null if no suitable driver found.
 */
export async function autoAssignDriver(
  orderId: string,
  pickupLat: number,
  pickupLng: number,
): Promise<Driver | null> {
  const candidates = await findBestDrivers(pickupLat, pickupLng, 1)

  if (candidates.length === 0) return null

  const best = candidates[0]

  // Assign driver to order in both collections
  await assignDriver(best.driver.id, orderId, { driverName: best.driver.name })
  await updateOrderDriver(orderId, {
    id: best.driver.id,
    name: best.driver.name,
    phone: best.driver.phone,
  })

  return best.driver
}
