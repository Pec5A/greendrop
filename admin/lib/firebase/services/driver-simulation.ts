/**
 * Service de simulation de mouvement des chauffeurs
 * Pour démonstration académique uniquement
 */

import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"

interface DriverSimulation {
  id: string
  currentLat: number
  currentLng: number
  targetLat: number
  targetLng: number
  status: string
}

const PARIS_BOUNDS = {
  minLat: 48.815,
  maxLat: 48.902,
  minLng: 2.225,
  maxLng: 2.469,
}

const STATUSES = ["online", "busy", "break", "offline"]
const UPDATE_INTERVAL = 8000 // 8 secondes
const MOVEMENT_DELTA = 0.0015 // ~150 mètres
const STATUS_CHANGE_PROBABILITY = 0.15 // 15% de chance

let simulationInterval: NodeJS.Timeout | null = null
let isSimulating = false
let driversData: DriverSimulation[] = []

/**
 * Génère un mouvement aléatoire dans une direction
 */
function getRandomMovement(): { latDelta: number; lngDelta: number } {
  const angle = Math.random() * 2 * Math.PI
  const distance = MOVEMENT_DELTA * (0.5 + Math.random() * 0.5) // 50-100% du delta max

  return {
    latDelta: Math.cos(angle) * distance,
    lngDelta: Math.sin(angle) * distance,
  }
}

/**
 * S'assure que les coordonnées restent dans les limites de Paris
 */
function constrainToParis(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.max(PARIS_BOUNDS.minLat, Math.min(PARIS_BOUNDS.maxLat, lat)),
    lng: Math.max(PARIS_BOUNDS.minLng, Math.min(PARIS_BOUNDS.maxLng, lng)),
  }
}

/**
 * Obtient un nouveau statut aléatoire (favorise online et busy)
 */
function getRandomStatus(currentStatus: string): string {
  if (Math.random() > STATUS_CHANGE_PROBABILITY) {
    return currentStatus // Pas de changement
  }

  // Favorise online (50%) et busy (30%)
  const rand = Math.random()
  if (rand < 0.5) return "online"
  if (rand < 0.8) return "busy"
  if (rand < 0.95) return "break"
  return "offline"
}

/**
 * Charge les données initiales des chauffeurs
 */
async function loadDriversData(): Promise<void> {
  try {
    const driversSnapshot = await getDocs(collection(db, COLLECTIONS.DRIVERS))

    driversData = driversSnapshot.docs.map((doc) => {
      const data = doc.data()
      const location = data.location || { lat: 48.8566, lng: 2.3522 } // Centre Paris par défaut

      return {
        id: doc.id,
        currentLat: location.lat,
        currentLng: location.lng,
        targetLat: location.lat,
        targetLng: location.lng,
        status: data.status || "online",
      }
    })

    console.log(`✅ Simulation chargée: ${driversData.length} chauffeurs`)
  } catch (error) {
    console.error("❌ Erreur chargement chauffeurs:", error)
  }
}

/**
 * Met à jour la position d'un chauffeur dans Firestore
 */
async function updateDriverPosition(driver: DriverSimulation): Promise<void> {
  try {
    const driverRef = doc(db, COLLECTIONS.DRIVERS, driver.id)

    await updateDoc(driverRef, {
      location: {
        lat: driver.currentLat,
        lng: driver.currentLng,
        updatedAt: new Date().toISOString(),
      },
      status: driver.status,
      lastSeenAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`❌ Erreur mise à jour chauffeur ${driver.id}:`, error)
  }
}

/**
 * Effectue une étape de simulation
 */
async function simulationStep(): Promise<void> {
  if (driversData.length === 0) return

  const updatePromises = driversData.map(async (driver) => {
    // Déplacement aléatoire
    const movement = getRandomMovement()
    const newLat = driver.currentLat + movement.latDelta
    const newLng = driver.currentLng + movement.lngDelta

    // Contrainte dans Paris
    const constrained = constrainToParis(newLat, newLng)
    driver.currentLat = constrained.lat
    driver.currentLng = constrained.lng

    // Changement de statut aléatoire
    driver.status = getRandomStatus(driver.status)

    // Mise à jour Firestore
    await updateDriverPosition(driver)
  })

  await Promise.all(updatePromises)
  console.log(`🔄 Simulation: ${driversData.length} chauffeurs mis à jour`)
}

/**
 * Démarre la simulation
 */
export async function startSimulation(): Promise<void> {
  if (isSimulating) {
    console.warn("⚠️ Simulation déjà en cours")
    return
  }

  console.log("🚀 Démarrage simulation chauffeurs...")
  await loadDriversData()

  if (driversData.length === 0) {
    console.error("❌ Aucun chauffeur à simuler")
    return
  }

  isSimulating = true

  // Première mise à jour immédiate
  await simulationStep()

  // Puis toutes les X secondes
  simulationInterval = setInterval(async () => {
    if (isSimulating) {
      await simulationStep()
    }
  }, UPDATE_INTERVAL)

  console.log(`✅ Simulation démarrée (${UPDATE_INTERVAL / 1000}s)`)
}

/**
 * Arrête la simulation
 */
export function stopSimulation(): void {
  if (!isSimulating) {
    console.warn("⚠️ Aucune simulation en cours")
    return
  }

  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }

  isSimulating = false
  console.log("⏹️ Simulation arrêtée")
}

/**
 * Vérifie si la simulation est active
 */
export function isSimulationActive(): boolean {
  return isSimulating
}

/**
 * Réinitialise les positions des chauffeurs
 */
export async function resetDriverPositions(): Promise<void> {
  console.log("🔄 Réinitialisation positions chauffeurs...")
  await loadDriversData()
  console.log("✅ Positions réinitialisées")
}
