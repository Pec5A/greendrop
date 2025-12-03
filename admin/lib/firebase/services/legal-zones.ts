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
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "../config"
import { COLLECTIONS } from "../collections"
import type { LegalZone, MapCoordinate } from "@/lib/types"
import { logZoneCreated, logZoneUpdated, logZoneDeleted } from "./activity-logs"

// Extended LegalZone type for the map editor
export interface LegalZoneExtended extends LegalZone {
  color: string
}

const normalizeCoordinates = (value: unknown): MapCoordinate[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        const [x, y] = point
        return { x: Number(x) || 0, y: Number(y) || 0 }
      }

      if (point && typeof point === "object" && "x" in point && "y" in point) {
        const { x, y } = point as { x?: number; y?: number }
        return { x: Number(x) || 0, y: Number(y) || 0 }
      }

      return null
    })
    .filter((point): point is MapCoordinate => point !== null)
}

const serializeCoordinates = (coordinates: MapCoordinate[] = []): MapCoordinate[] =>
  coordinates.map((point) => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }))

const summarizeZoneMetadata = (zoneData: Partial<LegalZoneExtended>) => {
  const metadata: Record<string, any> = {}
  if (zoneData.type) metadata.type = zoneData.type
  if (typeof zoneData.active === "boolean") metadata.active = zoneData.active
  if (zoneData.coordinates) metadata.points = zoneData.coordinates.length
  if (zoneData.color) metadata.color = zoneData.color
  return metadata
}

// Convert Firestore document to LegalZone type
const convertLegalZone = (doc: any): LegalZoneExtended => {
  const data = doc.data()
  return {
    id: doc.id,
    name: data.name,
    type: data.type,
    coordinates: normalizeCoordinates(data.coordinates),
    active: data.active ?? true,
    color: data.color || (data.type === "delivery" ? "#10b981" : "#ef4444"),
  }
}

// Get all legal zones
export const getLegalZones = async (): Promise<LegalZoneExtended[]> => {
  const zonesRef = collection(db, COLLECTIONS.LEGAL_ZONES)
  const snapshot = await getDocs(zonesRef)
  return snapshot.docs.map(convertLegalZone)
}

// Get legal zone by ID
export const getLegalZoneById = async (id: string): Promise<LegalZoneExtended | null> => {
  const docRef = doc(db, COLLECTIONS.LEGAL_ZONES, id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return convertLegalZone(docSnap)
  }
  return null
}

// Get active legal zones
export const getActiveLegalZones = async (): Promise<LegalZoneExtended[]> => {
  const zonesRef = collection(db, COLLECTIONS.LEGAL_ZONES)
  const q = query(zonesRef, where("active", "==", true))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertLegalZone)
}

// Get legal zones by type
export const getLegalZonesByType = async (
  type: LegalZone["type"]
): Promise<LegalZoneExtended[]> => {
  const zonesRef = collection(db, COLLECTIONS.LEGAL_ZONES)
  const q = query(zonesRef, where("type", "==", type))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(convertLegalZone)
}

// Create legal zone
export const createLegalZone = async (
  zoneData: Omit<LegalZoneExtended, "id">
): Promise<string> => {
  const zonesRef = collection(db, COLLECTIONS.LEGAL_ZONES)
  const docRef = await addDoc(zonesRef, {
    ...zoneData,
    coordinates: serializeCoordinates(zoneData.coordinates),
    createdAt: serverTimestamp(),
  })
  await logZoneCreated(docRef.id, zoneData.name, zoneData.type)
  return docRef.id
}

// Update legal zone
export const updateLegalZone = async (
  id: string,
  zoneData: Partial<LegalZoneExtended>
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.LEGAL_ZONES, id)
  await updateDoc(docRef, {
    ...zoneData,
    ...(zoneData.coordinates && { coordinates: serializeCoordinates(zoneData.coordinates) }),
    updatedAt: serverTimestamp(),
  })
  await logZoneUpdated(id, zoneData.name || id, summarizeZoneMetadata(zoneData))
}

// Toggle legal zone active status
export const toggleLegalZoneActive = async (
  id: string,
  active: boolean,
  zoneName?: string
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.LEGAL_ZONES, id)
  await updateDoc(docRef, {
    active,
    updatedAt: serverTimestamp(),
  })
  await logZoneUpdated(id, zoneName || id, { active })
}

// Delete legal zone
export const deleteLegalZone = async (id: string, zoneName?: string): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.LEGAL_ZONES, id)
  await deleteDoc(docRef)
  await logZoneDeleted(id, zoneName || id)
}

// Save multiple zones (replace all)
export const saveAllLegalZones = async (zones: LegalZoneExtended[]): Promise<void> => {
  // Get existing zones
  const existingZones = await getLegalZones()
  const existingIds = new Set(existingZones.map((z) => z.id))
  const newIds = new Set(zones.filter((z) => z.id).map((z) => z.id))

  // Delete zones that are no longer present
  const deletePromises = existingZones
    .filter((z) => !newIds.has(z.id))
    .map((z) => deleteLegalZone(z.id, z.name))

  // Update or create zones
  const upsertPromises = zones.map(async (zone) => {
    if (zone.id && existingIds.has(zone.id)) {
      return updateLegalZone(zone.id, zone)
    } else {
      const { id, ...zoneData } = zone
      return createLegalZone(zoneData)
    }
  })

  await Promise.all([...deletePromises, ...upsertPromises])
}

// Subscribe to legal zones (real-time updates)
export const subscribeToLegalZones = (
  callback: (zones: LegalZoneExtended[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const zonesRef = collection(db, COLLECTIONS.LEGAL_ZONES)
  
  return onSnapshot(
    zonesRef,
    (snapshot) => {
      const zones = snapshot.docs.map(convertLegalZone)
      callback(zones)
    },
    (error) => {
      console.error("Error subscribing to legal zones:", error)
      onError?.(error)
    }
  )
}

// Get legal zone statistics
export const getLegalZoneStats = async () => {
  const zones = await getLegalZones()
  
  return {
    total: zones.length,
    delivery: zones.filter((z) => z.type === "delivery").length,
    restricted: zones.filter((z) => z.type === "restricted").length,
    active: zones.filter((z) => z.active).length,
    inactive: zones.filter((z) => !z.active).length,
  }
}
