/**
 * API: Créer une nouvelle commande
 * Endpoint: createOrder
 * Méthode: POST (Callable Function)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

interface CreateOrderRequest {
  shopId: string
  items: Array<{
    productId: string
    name: string
    quantity: number
    price: number
  }>
  pickupAddress: string
  dropoffAddress: string
  dropoffCoordinates: {
    lat: number
    lng: number
  }
  paymentMethod: "card" | "cash"
  notes?: string
}

export const createOrder = onCall(async (request) => {
  const db = getFirestore()

  // Vérifier l'authentification
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié")
  }

  const userId = request.auth.uid
  const data = request.data as CreateOrderRequest

  // Validation des données
  if (!data.shopId || !data.items || data.items.length === 0) {
    throw new HttpsError("invalid-argument", "Données de commande invalides")
  }

  if (!data.dropoffAddress || !data.dropoffCoordinates) {
    throw new HttpsError("invalid-argument", "Adresse de livraison requise")
  }

  try {
    // Calculer le total
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Récupérer les infos de la boutique
    const shopDoc = await db.collection("shops").doc(data.shopId).get()
    if (!shopDoc.exists) {
      throw new HttpsError("not-found", "Boutique introuvable")
    }

    const shopData = shopDoc.data()
    const deliveryFee = shopData?.deliveryFee || 2.5

    // Générer une référence unique
    const orderRef = `ORD-${Date.now()}`

    // Créer la commande
    const orderData = {
      userId,
      shopId: data.shopId,
      shopName: shopData?.name || "Boutique",
      reference: orderRef,
      status: "created",
      priority: total > 50 ? "high" : "normal",
      total: total + deliveryFee,
      currency: "EUR",
      items: data.items,
      pickupAddress: data.pickupAddress || shopData?.address,
      dropoffAddress: data.dropoffAddress,
      dropoffCoordinates: data.dropoffCoordinates,
      paymentMethod: data.paymentMethod,
      notes: data.notes || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      expectedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45min
    }

    const orderDocRef = await db.collection("orders").add(orderData)

    // Logger l'activité
    await db.collection("activity_logs").add({
      type: "order_created",
      userId,
      orderId: orderDocRef.id,
      reference: orderRef,
      details: `Nouvelle commande de ${total.toFixed(2)}€`,
      timestamp: FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      orderId: orderDocRef.id,
      reference: orderRef,
      total: total + deliveryFee,
      message: "Commande créée avec succès",
    }
  } catch (error: any) {
    console.error("Erreur création commande:", error)
    throw new HttpsError("internal", error.message || "Erreur lors de la création de la commande")
  }
})
