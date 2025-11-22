import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * GET /api/orders/my - Récupérer les commandes de l'utilisateur connecté
 * Query params:
 * - status: filtrer par statut (pending, confirmed, preparing, ready, delivering, delivered, cancelled)
 * - limit: nombre de résultats (défaut: 20, max: 100)
 * - cursor: ID du dernier document pour pagination cursor-based
 * - sortBy: champ de tri (createdAt, updatedAt, total) - défaut: createdAt
 * - sortOrder: ordre de tri (asc, desc) - défaut: desc
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const cursor = searchParams.get("cursor");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    // Valider le champ de tri
    const validSortFields = ["createdAt", "updatedAt", "total"];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json(
        { error: "Bad Request", message: `sortBy doit être: ${validSortFields.join(", ")}` },
        { status: 400 }
      );
    }

    let query = adminDb.collection("orders").where("userId", "==", auth.userId);

    // Filtrer par status si fourni
    if (status) {
      query = query.where("status", "==", status) as FirebaseFirestore.Query;
    }

    // Appliquer le tri
    query = query.orderBy(sortBy, sortOrder);

    // Pagination cursor-based
    if (cursor) {
      const cursorDoc = await adminDb.collection("orders").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Appliquer la limite (+1 pour déterminer hasMore)
    const snapshot = await query.limit(limit + 1).get();

    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;

    const orders = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      estimatedDeliveryTime: doc.data().estimatedDeliveryTime?.toDate?.()?.toISOString() || doc.data().estimatedDeliveryTime,
    }));

    // Récupérer le curseur pour la prochaine page
    const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        limit,
        hasMore,
        nextCursor,
        count: orders.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
