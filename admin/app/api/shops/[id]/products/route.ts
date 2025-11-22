import { NextRequest, NextResponse } from "next/server"
import { withAuth, handleApiError } from "@/lib/api-middleware"
import { adminDb } from "@/lib/firebase-admin"

/**
 * GET /api/shops/[id]/products - Récupérer les produits d'une boutique
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (_req: NextRequest, _auth) => {
    try {
      const { id: shopId } = await context.params

      // Vérifier que la boutique existe
      const shopDoc = await adminDb.collection("shops").doc(shopId).get()
      if (!shopDoc.exists) {
        return NextResponse.json({ error: "Not Found", message: "Boutique introuvable" }, { status: 404 })
      }

      // Récupérer les produits
      const snapshot = await adminDb
        .collection("products")
        .where("shopId", "==", shopId)
        .where("isAvailable", "==", true)
        .get()

      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      return NextResponse.json({
        success: true,
        products,
      })
    } catch (error) {
      return handleApiError(error)
    }
  })(request)
}
