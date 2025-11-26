import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/drivers/location - Mettre à jour la position GPS du chauffeur
 */
export const POST = withAuth(
  async (request: NextRequest, auth) => {
    try {
      const body = await request.json();
      const { latitude, longitude, heading, speed } = body;

      if (!latitude || !longitude) {
        return NextResponse.json(
          { error: "Bad Request", message: "latitude et longitude sont requis" },
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

      // Mettre à jour la position
      await adminDb.collection("drivers").doc(driverDoc.id).update({
        currentLocation: {
          latitude,
          longitude,
        },
        heading: heading || 0,
        speed: speed || 0,
        lastLocationUpdate: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Position mise à jour",
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { requiredRole: "driver" }
);
