import { NextRequest, NextResponse } from "next/server"
import { withAuth, handleApiError } from "@/lib/api-middleware"
import { adminDb, messaging } from "@/lib/firebase-admin"

/**
 * GET /api/orders/[id] - Récupérer les détails d'une commande
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: NextRequest, auth) => {
    try {
      const { id: orderId } = await context.params
      const orderDoc = await adminDb.collection("orders").doc(orderId).get()

      if (!orderDoc.exists) {
        return NextResponse.json({ error: "Not Found", message: "Commande introuvable" }, { status: 404 })
      }

      const order = orderDoc.data()

      // Vérifier les permissions
      if (auth.userRole !== "admin" && order?.userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden", message: "Accès non autorisé" }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        order: {
          id: orderDoc.id,
          ...order,
          createdAt: order?.createdAt?.toDate?.()?.toISOString() || order?.createdAt,
          updatedAt: order?.updatedAt?.toDate?.()?.toISOString() || order?.updatedAt,
          estimatedDeliveryTime:
            order?.estimatedDeliveryTime?.toDate?.()?.toISOString() || order?.estimatedDeliveryTime,
        },
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(request)
}

/**
 * PATCH /api/orders/[id] - Mettre à jour le statut d'une commande
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: NextRequest, auth) => {
    try {
      const { id: orderId } = await context.params
      const body = await request.json()
      const { status, driverId } = body

      if (!status) {
        return NextResponse.json({ error: "Bad Request", message: "Le champ 'status' est requis" }, { status: 400 })
      }

      const orderDoc = await adminDb.collection("orders").doc(orderId).get()
      if (!orderDoc.exists) {
        return NextResponse.json({ error: "Not Found", message: "Commande introuvable" }, { status: 404 })
      }

      const order = orderDoc.data()

      // Vérifier les permissions
      const isAdmin = auth.userRole === "admin"
      const isDriver = auth.userRole === "driver" && order?.driverId === auth.userId

      // Vérifier que le marchand est bien propriétaire de la boutique liée à la commande
      let isMerchant = false
      if (auth.userRole === "merchant" && order?.shopId) {
        const shopDoc = await adminDb.collection("shops").doc(order.shopId).get()
        isMerchant = shopDoc.exists && shopDoc.data()?.ownerId === auth.userId
      }

      if (!isAdmin && !isDriver && !isMerchant) {
        return NextResponse.json(
          { error: "Forbidden", message: "Vous n'avez pas la permission de modifier cette commande" },
          { status: 403 }
        )
      }

      // Mettre à jour la commande
      const updates: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      }

      if (driverId) {
        updates.driverId = driverId
      }

      await adminDb.collection("orders").doc(orderId).update(updates)

      // Log d'activité
      await adminDb.collection("activities").add({
        type: "order_status_updated",
        orderId,
        userId: auth.userId,
        description: `Statut mis à jour: ${status}`,
        timestamp: new Date(),
      })

      // Envoyer notification push à l'utilisateur de la commande
      if (order?.userId) {
        try {
          const tokensSnapshot = await adminDb.collection("fcmTokens").where("userId", "==", order.userId).get()

          const tokens = tokensSnapshot.docs.map((doc) => doc.data().token).filter(Boolean)

          if (tokens.length > 0) {
            await messaging.sendEachForMulticast({
              tokens,
              notification: {
                title: "Commande mise à jour",
                body: `Votre commande #${orderId.slice(-6).toUpperCase()} est maintenant: ${status}`,
              },
              data: { orderId, status, type: "order_update" },
            })
          }

          // Stocker la notification dans Firestore
          await adminDb.collection("notifications").add({
            userId: order.userId,
            title: "Commande mise à jour",
            message: `Votre commande #${orderId.slice(-6).toUpperCase()} est maintenant: ${status}`,
            type: "order_update",
            orderId,
            isRead: false,
            createdAt: new Date(),
          })
        } catch (notifError) {
          // Ne pas bloquer la réponse si la notification échoue
          console.error("Erreur notification push:", notifError)
        }
      }

      return NextResponse.json({
        success: true,
        message: "Commande mise à jour",
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(request)
}
