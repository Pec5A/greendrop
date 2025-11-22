import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * GET /api/orders - Récupérer la liste des commandes (admin/driver/merchant)
 * Query params:
 * - status: filtrer par statut
 * - shopId: filtrer par boutique (merchant)
 * - driverId: filtrer par livreur (driver/admin)
 * - limit: nombre de résultats (défaut: 20, max: 100)
 * - cursor: ID du dernier document pour pagination
 * - sortOrder: ordre de tri (asc, desc) - défaut: desc
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const shopId = searchParams.get("shopId");
    const driverId = searchParams.get("driverId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const cursor = searchParams.get("cursor");
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    let query: FirebaseFirestore.Query = adminDb.collection("orders");

    // Appliquer les filtres selon le rôle
    if (auth.userRole === "driver") {
      // Les drivers voient les commandes assignées ou disponibles
      if (driverId) {
        query = query.where("driverId", "==", driverId);
      } else {
        // Commandes disponibles (pending/confirmed sans driver assigné)
        query = query.where("status", "in", ["pending", "confirmed"]);
      }
    } else if (auth.userRole === "merchant") {
      // Les merchants voient uniquement les commandes de leurs boutiques
      if (!shopId) {
        return NextResponse.json(
          { error: "Bad Request", message: "shopId requis pour les merchants" },
          { status: 400 }
        );
      }
      query = query.where("shopId", "==", shopId);
    } else if (auth.userRole !== "admin") {
      // Les utilisateurs normaux doivent utiliser /api/orders/my
      return NextResponse.json(
        { error: "Forbidden", message: "Utilisez /api/orders/my pour vos commandes" },
        { status: 403 }
      );
    }

    // Filtres additionnels
    if (status) {
      query = query.where("status", "==", status);
    }

    if (shopId && auth.userRole === "admin") {
      query = query.where("shopId", "==", shopId);
    }

    if (driverId && auth.userRole === "admin") {
      query = query.where("driverId", "==", driverId);
    }

    // Tri par date de création
    query = query.orderBy("createdAt", sortOrder);

    // Pagination cursor-based
    if (cursor) {
      const cursorDoc = await adminDb.collection("orders").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Limite + 1 pour détecter hasMore
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

/**
 * POST /api/orders - Créer une nouvelle commande
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const { shopId, items, deliveryAddress, deliveryLocation, paymentMethod, notes } = body;

    // Validation
    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "shopId et items sont requis" },
        { status: 400 }
      );
    }

    if (!deliveryAddress || !deliveryLocation?.latitude || !deliveryLocation?.longitude) {
      return NextResponse.json(
        { error: "Bad Request", message: "Adresse de livraison complète requise" },
        { status: 400 }
      );
    }

    // Vérifier que la boutique existe
    const shopDoc = await adminDb.collection("shops").doc(shopId).get();
    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: "Not Found", message: "Boutique introuvable" },
        { status: 404 }
      );
    }

    // Calculer le total
    let total = 0;
    for (const item of items) {
      const productDoc = await adminDb.collection("products").doc(item.productId).get();
      if (!productDoc.exists) {
        return NextResponse.json(
          { error: "Not Found", message: `Produit ${item.productId} introuvable` },
          { status: 404 }
        );
      }
      const product = productDoc.data();
      total += product!.price * item.quantity;
    }

    // Ajouter frais de livraison (exemple: 5€)
    const deliveryFee = 5.0;
    total += deliveryFee;

    // Créer la commande
    const orderRef = adminDb.collection("orders").doc();
    const orderData = {
      id: orderRef.id,
      reference: `ORD-${Date.now()}`,
      userId: auth.userId,
      shopId,
      items,
      total,
      deliveryFee,
      status: "pending",
      paymentMethod: paymentMethod || "cash",
      paymentStatus: "pending",
      deliveryAddress,
      deliveryLocation,
      notes: notes || "",
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // +30 min
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await orderRef.set(orderData);

    // Créer log d'activité
    await adminDb.collection("activities").add({
      type: "order_created",
      orderId: orderRef.id,
      userId: auth.userId,
      description: `Commande ${orderData.reference} créée`,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      order: orderData,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
