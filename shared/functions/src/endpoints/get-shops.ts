/**
 * API: Récupérer les boutiques et produits
 * Endpoint: getShops
 * Méthode: GET (Callable Function)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https"
import { getFirestore } from "firebase-admin/firestore"

interface GetShopsRequest {
  userLocation?: {
    lat: number
    lng: number
  }
  radius?: number // en km
  category?: string
  search?: string
}

export const getShops = onCall(async (request) => {
  const db = getFirestore()
  const data = request.data as GetShopsRequest

  try {
    let query = db.collection("shops").where("status", "==", "active")

    if (data.category) {
      query = query.where("categories", "array-contains", data.category)
    }

    const shopsSnapshot = await query.get()
    const shops: any[] = []

    shopsSnapshot.forEach((doc) => {
      const shopData = doc.data()

      // Filtrer par recherche texte
      if (data.search) {
        const searchLower = data.search.toLowerCase()
        const matchName = shopData.name?.toLowerCase().includes(searchLower)
        const matchCategory = shopData.categories?.some((cat: string) =>
          cat.toLowerCase().includes(searchLower)
        )
        if (!matchName && !matchCategory) return
      }

      shops.push({
        id: doc.id,
        ...shopData,
      })
    })

    // Si position fournie, calculer la distance
    if (data.userLocation) {
      shops.forEach((shop) => {
        if (shop.coordinates) {
          shop.distance = calculateDistance(
            data.userLocation!.lat,
            data.userLocation!.lng,
            shop.coordinates.lat,
            shop.coordinates.lng
          )
        }
      })

      // Filtrer par rayon si spécifié
      const filteredShops = data.radius
        ? shops.filter((shop) => shop.distance && shop.distance <= data.radius!)
        : shops

      // Trier par distance
      filteredShops.sort((a, b) => (a.distance || 999) - (b.distance || 999))

      return { success: true, shops: filteredShops }
    }

    return { success: true, shops }
  } catch (error: any) {
    console.error("Erreur récupération boutiques:", error)
    throw new HttpsError("internal", "Erreur lors de la récupération des boutiques")
  }
})

/**
 * API: Récupérer les produits d'une boutique
 * Endpoint: getProducts
 */
export const getProducts = onCall(async (request) => {
  const db = getFirestore()
  const { shopId } = request.data

  if (!shopId) {
    throw new HttpsError("invalid-argument", "shopId requis")
  }

  try {
    const productsSnapshot = await db.collection("products").where("shopId", "==", shopId).get()

    const products: any[] = []
    productsSnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, products }
  } catch (error: any) {
    console.error("Erreur récupération produits:", error)
    throw new HttpsError("internal", "Erreur lors de la récupération des produits")
  }
})

// Fonction utilitaire: calcul de distance (formule Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}
