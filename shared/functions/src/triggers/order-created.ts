import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Sentry } from "../sentry";

const db = admin.firestore();

/**
 * Triggered when a new order is created
 * - Logs activity
 * - Sends notification to admin dashboard
 * - Initializes order timeline
 */
export const onOrderCreated = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data();
    const orderId = context.params.orderId;

    try {
      console.log(`New order created: ${orderId}`);

      const batch = db.batch();

      // 1. Log activity
      const activityLogRef = db.collection("activityLogs").doc();
      batch.set(activityLogRef, {
        entityType: "order",
        entityId: orderId,
        type: "order_created",
        message: `New order created by user ${order.userName || order.userId}`,
        userId: order.userId,
        metadata: {
          total: order.total,
          itemCount: order.items?.length || 0,
          status: order.status,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Initialize timeline if not present
      if (!order.timeline || order.timeline.length === 0) {
        const orderRef = db.collection("orders").doc(orderId);
        batch.update(orderRef, {
          timeline: [
            {
              id: `event_${Date.now()}`,
              type: "status",
              title: "Order created",
              description: "Order has been successfully placed",
              timestamp: new Date().toISOString(),
              actor: "system",
            },
          ],
        });
      }

      // 3. Send notification to admin dashboard
      const adminNotifRef = db.collection("notifications").doc();
      batch.set(adminNotifRef, {
        target: "admin",
        type: "info",
        category: "order",
        title: "Nouvelle commande",
        message: `Commande #${orderId.slice(-6).toUpperCase()} — ${order.items?.length || 0} article(s), ${order.total ?? 0} MAD`,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      console.log(`Order ${orderId} initialization completed`);
      return null;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
