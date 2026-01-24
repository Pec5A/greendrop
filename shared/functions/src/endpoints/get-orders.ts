/**
 * API: Récupérer les commandes d'un utilisateur
 * Endpoint: getMyOrders
 * Méthode: GET (Callable Function)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https"
import { getFirestore } from "firebase-admin/firestore"

interface GetMyOrdersRequest {
  status?: string
  limit?: number
}

export const getMyOrders = onCall(async (request) => {
  const db = getFirestore()

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié")
  }

  const userId = request.auth.uid
  const data = request.data as GetMyOrdersRequest

  try {
    let query = db.collection("orders").where("userId", "==", userId)

    if (data.status) {
      query = query.where("status", "==", data.status)
    }

    query = query.orderBy("createdAt", "desc")

    if (data.limit) {
      query = query.limit(data.limit)
    }

    const ordersSnapshot = await query.get()
    const orders: any[] = []

    ordersSnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, orders }
  } catch (error: any) {
    console.error("Erreur récupération commandes:", error)
    throw new HttpsError("internal", "Erreur lors de la récupération des commandes")
  }
})

/**
 * API: Récupérer les détails d'une commande
 * Endpoint: getOrderDetails
 */
export const getOrderDetails = onCall(async (request) => {
  const db = getFirestore()

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié")
  }

  const userId = request.auth.uid
  const { orderId } = request.data

  if (!orderId) {
    throw new HttpsError("invalid-argument", "orderId requis")
  }

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get()

    if (!orderDoc.exists) {
      throw new HttpsError("not-found", "Commande introuvable")
    }

    const orderData = orderDoc.data()

    // Vérifier les permissions
    const userDoc = await db.collection("users").doc(userId).get()
    const userRole = userDoc.data()?.role

    const canView =
      userRole === "admin" ||
      orderData?.userId === userId ||
      orderData?.driverId === userId ||
      (userRole === "merchant" && orderData?.shopId)

    if (!canView) {
      throw new HttpsError("permission-denied", "Vous n'avez pas la permission de voir cette commande")
    }

    return {
      success: true,
      order: {
        id: orderDoc.id,
        ...orderData,
      },
    }
  } catch (error: any) {
    console.error("Erreur récupération détails commande:", error)
    throw new HttpsError("internal", error.message || "Erreur lors de la récupération")
  }
})
