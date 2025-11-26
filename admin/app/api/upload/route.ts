import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminStorage, adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/upload - Upload un fichier en Base64 vers Firebase Storage
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const { base64Data, mimeType, orderId, fileType } = body;

    if (!base64Data || !mimeType) {
      return NextResponse.json(
        { error: "Bad Request", message: "base64Data et mimeType sont requis" },
        { status: 400 }
      );
    }

    // Décoder Base64
    const buffer = Buffer.from(base64Data, "base64");

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = `${fileType || "file"}_${timestamp}`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(`uploads/${auth.userId}/${fileName}`);

    // Upload vers Storage
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Rendre le fichier public
    await file.makePublic();

    // Obtenir l'URL publique
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

    // Si orderId fourni, mettre à jour la commande
    if (orderId && fileType === "delivery_proof") {
      const orderDoc = await adminDb.collection("orders").doc(orderId).get();
      
      if (orderDoc.exists) {
        const order = orderDoc.data();
        
        // Vérifier permissions
        if (auth.userRole === "admin" || order?.driverId === auth.userId) {
          await adminDb.collection("orders").doc(orderId).update({
            deliveryPhoto: publicUrl,
            updatedAt: new Date(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
