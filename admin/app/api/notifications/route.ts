import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

/**
 * POST /api/notifications/send - Envoyer une notification push (admin uniquement)
 */
export const POST = withAuth(
  async (request: NextRequest, auth) => {
    try {
      const body = await request.json();
      const { userId, title, message, data } = body;

      if (!userId || !title || !message) {
        return NextResponse.json(
          { error: "Bad Request", message: "userId, title et message sont requis" },
          { status: 400 }
        );
      }

      // Récupérer les tokens FCM de l'utilisateur
      const tokensSnapshot = await adminDb
        .collection("fcmTokens")
        .where("userId", "==", userId)
        .get();

      if (tokensSnapshot.empty) {
        return NextResponse.json(
          { error: "Not Found", message: "Aucun token FCM trouvé pour cet utilisateur" },
          { status: 404 }
        );
      }

      const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

      // Envoyer la notification via FCM
      const messaging = getMessaging();
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title,
          body: message,
        },
        data: data || {},
      });

      // Nettoyer les tokens invalides
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && (resp.error?.code === "messaging/invalid-registration-token" || 
            resp.error?.code === "messaging/registration-token-not-registered")) {
          invalidTokens.push(tokens[idx]);
        }
      });

      // Supprimer les tokens invalides
      if (invalidTokens.length > 0) {
        const batch = adminDb.batch();
        const invalidDocs = tokensSnapshot.docs.filter((doc) =>
          invalidTokens.includes(doc.data().token)
        );
        invalidDocs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      // Sauvegarder la notification
      await adminDb.collection("notifications").add({
        userId,
        title,
        message,
        data: data || {},
        sentBy: auth.userId,
        sentAt: new Date(),
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return NextResponse.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { requiredRole: "admin" }
);

/**
 * PUT /api/notifications/token - Enregistrer un token FCM
 */
export const PUT = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const { token, deviceId } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Bad Request", message: "Le token FCM est requis" },
        { status: 400 }
      );
    }

    // Vérifier si le token existe déjà
    const existingToken = await adminDb
      .collection("fcmTokens")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (!existingToken.empty) {
      // Mettre à jour la date
      await adminDb
        .collection("fcmTokens")
        .doc(existingToken.docs[0].id)
        .update({
          userId: auth.userId,
          lastUsed: new Date(),
        });
    } else {
      // Créer nouveau token
      await adminDb.collection("fcmTokens").add({
        userId: auth.userId,
        token,
        deviceId: deviceId || null,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Token FCM enregistré",
    });
  } catch (error) {
    return handleApiError(error);
  }
});
