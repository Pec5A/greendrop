import { NextRequest, NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/api-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * GET /api/users/export - Export des données personnelles (RGPD Art. 20)
 * Permet à un utilisateur d'exporter toutes ses données personnelles au format JSON
 * Inclut: profil, commandes, avis, favoris, conversations
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      exportVersion: "1.0",
      userId: auth.userId,
    };

    // 1. Données du profil utilisateur
    const userDoc = await adminDb.collection("users").doc(auth.userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      exportData.profile = {
        id: userDoc.id,
        email: userData?.email,
        displayName: userData?.displayName,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        phone: userData?.phone,
        address: userData?.address,
        role: userData?.role,
        status: userData?.status,
        createdAt: userData?.createdAt?.toDate?.()?.toISOString() || userData?.createdAt,
        updatedAt: userData?.updatedAt?.toDate?.()?.toISOString() || userData?.updatedAt,
      };
    }

    // 2. Commandes de l'utilisateur
    const ordersSnapshot = await adminDb
      .collection("orders")
      .where("userId", "==", auth.userId)
      .orderBy("createdAt", "desc")
      .get();

    exportData.orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        reference: data.reference,
        status: data.status,
        total: data.total,
        deliveryFee: data.deliveryFee,
        deliveryAddress: data.deliveryAddress,
        items: data.items,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        notes: data.notes,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    // 3. Avis laissés par l'utilisateur
    const reviewsSnapshot = await adminDb
      .collection("reviews")
      .where("userId", "==", auth.userId)
      .orderBy("createdAt", "desc")
      .get();

    exportData.reviews = reviewsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        orderId: data.orderId,
        targetType: data.targetType,
        targetId: data.targetId,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
    });

    // 4. Favoris de l'utilisateur
    const favoritesSnapshot = await adminDb
      .collection("favorites")
      .where("userId", "==", auth.userId)
      .get();

    exportData.favorites = favoritesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        targetId: data.targetId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
    });

    // 5. Conversations/Messages
    const chatsSnapshot = await adminDb
      .collection("chats")
      .where("participants", "array-contains", auth.userId)
      .get();

    const chats = [];
    for (const chatDoc of chatsSnapshot.docs) {
      const messagesSnapshot = await chatDoc.ref
        .collection("messages")
        .orderBy("createdAt", "asc")
        .get();

      chats.push({
        id: chatDoc.id,
        orderId: chatDoc.data().orderId,
        participants: chatDoc.data().participants,
        messages: messagesSnapshot.docs.map((msgDoc) => {
          const msgData = msgDoc.data();
          return {
            id: msgDoc.id,
            senderId: msgData.senderId,
            content: msgData.content,
            type: msgData.type,
            createdAt: msgData.createdAt?.toDate?.()?.toISOString() || msgData.createdAt,
          };
        }),
      });
    }
    exportData.chats = chats;

    // 6. Notifications
    const notificationsSnapshot = await adminDb
      .collection("notifications")
      .where("userId", "==", auth.userId)
      .orderBy("createdAt", "desc")
      .limit(100) // Limiter aux 100 dernières
      .get();

    exportData.notifications = notificationsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        body: data.body,
        isRead: data.isRead,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
    });

    // 7. Si l'utilisateur est un driver, inclure ses données de livreur
    if (auth.userRole === "driver") {
      const driverDoc = await adminDb.collection("drivers").doc(auth.userId).get();
      if (driverDoc.exists) {
        const driverData = driverDoc.data();
        exportData.driverProfile = {
          id: driverDoc.id,
          vehicleType: driverData?.vehicleType,
          vehiclePlate: driverData?.vehiclePlate,
          isAvailable: driverData?.isAvailable,
          rating: driverData?.rating,
          reviewCount: driverData?.reviewCount,
          completedDeliveries: driverData?.completedDeliveries,
          totalEarnings: driverData?.totalEarnings,
          createdAt: driverData?.createdAt?.toDate?.()?.toISOString() || driverData?.createdAt,
        };
      }

      // Livraisons effectuées
      const deliveriesSnapshot = await adminDb
        .collection("orders")
        .where("driverId", "==", auth.userId)
        .orderBy("createdAt", "desc")
        .get();

      exportData.deliveries = deliveriesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          orderId: doc.id,
          reference: data.reference,
          status: data.status,
          deliveryFee: data.deliveryFee,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
        };
      });
    }

    // 8. Si l'utilisateur est un merchant, inclure ses données de boutique
    if (auth.userRole === "merchant") {
      const shopsSnapshot = await adminDb
        .collection("shops")
        .where("ownerId", "==", auth.userId)
        .get();

      exportData.shops = shopsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          address: data.address,
          rating: data.rating,
          reviewCount: data.reviewCount,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
      });
    }

    // 9. Disputes soumises
    const disputesSnapshot = await adminDb
      .collection("disputes")
      .where("userId", "==", auth.userId)
      .get();

    exportData.disputes = disputesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        orderId: data.orderId,
        type: data.type,
        description: data.description,
        status: data.status,
        resolution: data.resolution,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() || data.resolvedAt,
      };
    });

    // Retourner les données en JSON avec en-têtes pour le téléchargement
    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="greendrop-export-${auth.userId}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
