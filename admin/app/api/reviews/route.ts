import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { z } from "zod";

// Schema de validation pour la création d'avis
const createReviewSchema = z.object({
  orderId: z.string().min(1, "orderId est requis"),
  targetType: z.enum(["driver", "shop", "user"], {
    errorMap: () => ({ message: "targetType doit être 'driver', 'shop' ou 'user'" }),
  }),
  targetId: z.string().min(1, "targetId est requis"),
  rating: z.number().int().min(1).max(5, "La note doit être entre 1 et 5"),
  comment: z.string().max(1000, "Le commentaire ne peut pas dépasser 1000 caractères").optional(),
});

/**
 * POST /api/reviews - Créer un avis
 * Permet à un client de noter un livreur ou une boutique après une commande
 * Permet à un livreur de noter un client après une livraison
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();

    // Validation avec Zod
    const validationResult = createReviewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: validationResult.error.errors[0].message,
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { orderId, targetType, targetId, rating, comment } = validationResult.data;

    // Vérifier que la commande existe et appartient à l'utilisateur ou au livreur
    const orderDoc = await adminDb.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: "Not Found", message: "Commande introuvable" },
        { status: 404 }
      );
    }

    const order = orderDoc.data();

    // Vérifier les droits de l'utilisateur à laisser cet avis
    const isCustomer = order?.userId === auth.userId;
    const isDriver = order?.driverId === auth.userId;

    if (!isCustomer && !isDriver && auth.userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden", message: "Vous ne pouvez pas laisser d'avis sur cette commande" },
        { status: 403 }
      );
    }

    // Vérifier que la commande est terminée
    if (order?.status !== "delivered" && order?.status !== "completed") {
      return NextResponse.json(
        { error: "Bad Request", message: "La commande doit être terminée pour laisser un avis" },
        { status: 400 }
      );
    }

    // Vérifier la cohérence du type d'avis
    if (isCustomer && targetType === "user") {
      return NextResponse.json(
        { error: "Bad Request", message: "Un client ne peut pas noter un autre client" },
        { status: 400 }
      );
    }

    if (isDriver && targetType !== "user") {
      return NextResponse.json(
        { error: "Bad Request", message: "Un livreur ne peut noter que le client" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur n'a pas déjà laissé cet avis
    const existingReview = await adminDb
      .collection("reviews")
      .where("orderId", "==", orderId)
      .where("userId", "==", auth.userId)
      .where("targetType", "==", targetType)
      .where("targetId", "==", targetId)
      .get();

    if (!existingReview.empty) {
      return NextResponse.json(
        { error: "Conflict", message: "Vous avez déjà laissé un avis pour cette commande" },
        { status: 409 }
      );
    }

    // Créer l'avis
    const reviewRef = adminDb.collection("reviews").doc();
    const reviewData = {
      id: reviewRef.id,
      orderId,
      userId: auth.userId,
      targetType,
      targetId,
      rating,
      comment: comment || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await reviewRef.set(reviewData);

    // Mettre à jour la moyenne des notes de la cible
    await updateTargetRating(targetType, targetId);

    return NextResponse.json({
      success: true,
      review: reviewData,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

/**
 * GET /api/reviews - Récupérer les avis
 * Query params:
 * - targetType: 'driver' | 'shop' | 'user'
 * - targetId: ID de la cible
 * - limit: nombre d'avis (défaut: 20, max: 100)
 * - offset: pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: "Bad Request", message: "targetType et targetId sont requis" },
        { status: 400 }
      );
    }

    if (!["driver", "shop", "user"].includes(targetType)) {
      return NextResponse.json(
        { error: "Bad Request", message: "targetType doit être 'driver', 'shop' ou 'user'" },
        { status: 400 }
      );
    }

    // Récupérer les avis
    let query = adminDb
      .collection("reviews")
      .where("targetType", "==", targetType)
      .where("targetId", "==", targetId)
      .orderBy("createdAt", "desc");

    // Appliquer la pagination
    if (offset > 0) {
      const offsetSnapshot = await adminDb
        .collection("reviews")
        .where("targetType", "==", targetType)
        .where("targetId", "==", targetId)
        .orderBy("createdAt", "desc")
        .limit(offset)
        .get();

      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const reviewsSnapshot = await query.limit(limit).get();

    // Compter le total
    const countSnapshot = await adminDb
      .collection("reviews")
      .where("targetType", "==", targetType)
      .where("targetId", "==", targetId)
      .count()
      .get();

    const total = countSnapshot.data().count;

    const reviews = reviewsSnapshot.docs.map((doc) => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    }));

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + reviews.length < total,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Met à jour la note moyenne d'une cible (driver, shop, user)
 */
async function updateTargetRating(targetType: string, targetId: string) {
  const reviewsSnapshot = await adminDb
    .collection("reviews")
    .where("targetType", "==", targetType)
    .where("targetId", "==", targetId)
    .get();

  if (reviewsSnapshot.empty) {
    return;
  }

  let totalRating = 0;
  reviewsSnapshot.docs.forEach((doc) => {
    totalRating += doc.data().rating;
  });

  const averageRating = totalRating / reviewsSnapshot.docs.length;
  const reviewCount = reviewsSnapshot.docs.length;

  // Mettre à jour la collection appropriée
  const collectionName = targetType === "shop" ? "shops" : targetType === "driver" ? "drivers" : "users";

  await adminDb.collection(collectionName).doc(targetId).update({
    rating: Math.round(averageRating * 10) / 10, // Arrondi à 1 décimale
    reviewCount,
    updatedAt: new Date(),
  });
}
