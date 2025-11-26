import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/drivers/status - Mettre à jour le statut du chauffeur
 */
export const POST = withAuth(
  async (request: NextRequest, auth) => {
    try {
      const body = await request.json();
      const { status } = body;

      const validStatuses = ["available", "busy", "offline"];
      if (!status || !validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Bad Request", message: `Statut invalide. Valeurs acceptées: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }

      // Récupérer le document driver
      const driverSnapshot = await adminDb
        .collection("drivers")
        .where("userId", "==", auth.userId)
        .limit(1)
        .get();

      if (driverSnapshot.empty) {
        return NextResponse.json(
          { error: "Not Found", message: "Profil chauffeur introuvable" },
          { status: 404 }
        );
      }

      const driverDoc = driverSnapshot.docs[0];

      // Mettre à jour le statut
      await adminDb.collection("drivers").doc(driverDoc.id).update({
        status,
        updatedAt: new Date(),
      });

      // Log d'activité
      await adminDb.collection("activities").add({
        type: "driver_status_changed",
        driverId: driverDoc.id,
        userId: auth.userId,
        description: `Statut changé: ${status}`,
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Statut mis à jour",
        status,
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { requiredRole: "driver" }
);
