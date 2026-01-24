/**
 * API: Upload de photo (livraison, signature, etc.)
 * Endpoint: uploadFile
 * Méthode: POST (Callable Function)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https"
import { getStorage } from "firebase-admin/storage"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

interface UploadFileRequest {
  orderId?: string
  fileData: string // Base64
  fileName: string
  fileType: "delivery_photo" | "signature" | "product_image" | "document"
  mimeType: string
}

export const uploadFile = onCall(async (request) => {
  const db = getFirestore()
  const storage = getStorage()

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Utilisateur non authentifié")
  }

  const userId = request.auth.uid
  const data = request.data as UploadFileRequest

  if (!data.fileData || !data.fileName || !data.fileType) {
    throw new HttpsError("invalid-argument", "Données de fichier invalides")
  }

  try {
    // Convertir Base64 en Buffer
    const base64Data = data.fileData.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Générer un nom unique
    const timestamp = Date.now()
    const storagePath = `${data.fileType}/${userId}/${timestamp}_${data.fileName}`

    // Upload vers Firebase Storage
    const bucket = storage.bucket()
    const file = bucket.file(storagePath)

    await file.save(buffer, {
      metadata: {
        contentType: data.mimeType,
        metadata: {
          uploadedBy: userId,
          orderId: data.orderId || "",
          fileType: data.fileType,
        },
      },
    })

    // Rendre le fichier accessible publiquement
    await file.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

    // Si c'est une photo de livraison, mettre à jour la commande
    if (data.orderId && data.fileType === "delivery_photo") {
      await db.collection("orders").doc(data.orderId).update({
        deliveryPhoto: publicUrl,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    // Logger l'upload
    await db.collection("activity_logs").add({
      type: "file_uploaded",
      userId,
      fileType: data.fileType,
      orderId: data.orderId,
      fileUrl: publicUrl,
      timestamp: FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      fileUrl: publicUrl,
      message: "Fichier uploadé avec succès",
    }
  } catch (error: any) {
    console.error("Erreur upload fichier:", error)
    throw new HttpsError("internal", error.message || "Erreur lors de l'upload")
  }
})
