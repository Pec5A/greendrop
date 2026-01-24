/**
 * API: Mettre à jour le statut d'une commande
 * Endpoint: updateOrderStatus
 * Méthode: POST (Callable Function)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

type OrderStatus = "created" | "paid" | "confirmed" | "preparing" | "ready" | "picked_up" | "in_transit" | "delivered" | "cancelled"

interface UpdateOrderStatusRequest {
  orderId: string
  status: OrderStatus
  notes?: string
  deliveryPhoto?: string
  signature?: string
}

export const updateOrderStatus = onCall(async (request) => {
  const db = getFirestore()

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié")
  }

  const userId = request.auth.uid
  const data = request.data as UpdateOrderStatusRequest

  if (!data.orderId || !data.status) {
    throw new HttpsError("invalid-argument", "orderId et status requis")
  }

  try {
    const orderRef = db.collection("orders").doc(data.orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      throw new HttpsError("not-found", "Commande introuvable")
    }

    const orderData = orderDoc.data()

    // Vérifier les permissions
    const userDoc = await db.collection("users").doc(userId).get()
    const userRole = userDoc.data()?.role

    const canUpdate =
      userRole === "admin" ||
      (userRole === "driver" && orderData?.driverId === userId) ||
      (userRole === "merchant" && orderData?.shopId)

    if (!canUpdate) {
      throw new HttpsError("permission-denied", "Vous n'avez pas la permission de modifier cette commande")
    }

    // Construire les données de mise à jour
    const updateData: any = {
      status: data.status,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (data.notes) updateData.notes = data.notes
    if (data.deliveryPhoto) updateData.deliveryPhoto = data.deliveryPhoto
    if (data.signature) updateData.signature = data.signature

    if (data.status === "delivered") {
      updateData.deliveredAt = FieldValue.serverTimestamp()
    }

    await orderRef.update(updateData)

    // Logger l'activité
    await db.collection("activity_logs").add({
      type: "order_status_updated",
      userId,
      orderId: data.orderId,
      reference: orderData?.reference,
      oldStatus: orderData?.status,
      newStatus: data.status,
      details: `Statut changé: ${orderData?.status} → ${data.status}`,
      timestamp: FieldValue.serverTimestamp(),
    })

    // Envoyer notification au client
    if (orderData?.userId) {
      await db.collection("notifications").add({
        userId: orderData.userId,
        type: "order_update",
        title: "Mise à jour de commande",
        message: `Votre commande ${orderData.reference} est maintenant: ${getStatusLabel(data.status)}`,
        orderId: data.orderId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    return {
      success: true,
      orderId: data.orderId,
      status: data.status,
      message: "Statut mis à jour avec succès",
    }
  } catch (error: any) {
    console.error("Erreur mise à jour statut:", error)
    throw new HttpsError("internal", error.message || "Erreur lors de la mise à jour")
  }
})

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    created: "Créée",
    paid: "Payée",
    confirmed: "Confirmée",
    preparing: "En préparation",
    ready: "Prête",
    picked_up: "Récupérée",
    in_transit: "En transit",
    delivered: "Livrée",
    cancelled: "Annulée",
  }
  return labels[status] || status
}
