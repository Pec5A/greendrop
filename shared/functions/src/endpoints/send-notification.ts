/**
 * API: Envoyer une notification push
 * Endpoint: sendNotification
 * Méthode: POST (Callable Function)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"

interface SendNotificationRequest {
  userId: string
  title: string
  message: string
  type?: "order" | "delivery" | "promo" | "system"
  data?: Record<string, string>
}

export const sendNotification = onCall(async (request) => {
  const db = getFirestore()
  const messaging = getMessaging()

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié")
  }

  const data = request.data as SendNotificationRequest

  if (!data.userId || !data.title || !data.message) {
    throw new HttpsError("invalid-argument", "userId, title et message requis")
  }

  try {
    // Récupérer les tokens FCM de l'utilisateur
    const userDoc = await db.collection("users").doc(data.userId).get()
    const fcmTokens = userDoc.data()?.fcmTokens || []

    if (fcmTokens.length === 0) {
      console.log(`Aucun token FCM pour utilisateur ${data.userId}`)
      return {
        success: false,
        message: "Utilisateur n'a pas de token FCM",
      }
    }

    // Préparer le message
    const message = {
      notification: {
        title: data.title,
        body: data.message,
      },
      data: data.data || {},
      tokens: fcmTokens,
    }

    // Envoyer la notification
    const response = await messaging.sendMulticast(message)

    console.log(`Notifications envoyées: ${response.successCount}/${fcmTokens.length}`)

    // Supprimer les tokens invalides
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          tokensToRemove.push(fcmTokens[idx])
        }
      })

      if (tokensToRemove.length > 0) {
        const validTokens = fcmTokens.filter((token: string) => !tokensToRemove.includes(token))
        await db.collection("users").doc(data.userId).update({
          fcmTokens: validTokens,
        })
      }
    }

    // Enregistrer la notification dans Firestore
    await db.collection("notifications").add({
      userId: data.userId,
      type: data.type || "system",
      title: data.title,
      message: data.message,
      data: data.data || {},
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: "Notification envoyée",
    }
  } catch (error: any) {
    console.error("Erreur envoi notification:", error)
    throw new HttpsError("internal", error.message || "Erreur lors de l'envoi")
  }
})

/**
 * API: Enregistrer un token FCM
 * Endpoint: registerFCMToken
 */
export const registerFCMToken = onCall(async (request) => {
  const db = getFirestore()

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié")
  }

  const userId = request.auth.uid
  const { token } = request.data

  if (!token) {
    throw new HttpsError("invalid-argument", "token requis")
  }

  try {
    const userRef = db.collection("users").doc(userId)
    const userDoc = await userRef.get()

    const currentTokens = userDoc.data()?.fcmTokens || []

    // Ajouter le token s'il n'existe pas déjà
    if (!currentTokens.includes(token)) {
      await userRef.update({
        fcmTokens: FieldValue.arrayUnion(token),
      })
    }

    return {
      success: true,
      message: "Token FCM enregistré",
    }
  } catch (error: any) {
    console.error("Erreur enregistrement token:", error)
    throw new HttpsError("internal", "Erreur lors de l'enregistrement du token")
  }
})
