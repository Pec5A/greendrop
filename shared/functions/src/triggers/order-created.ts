import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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

    console.log(`New order created: ${orderId}`);

    const batch = db.batch();

    // 1. Log activity
    const activityLogRef = db.collection("activity-logs").doc();
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
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            actor: "system",
          },
        ],
      });
    }

    // 3. Send notification to admin (optional - for real-time dashboard alerts)
    // You can implement admin real-time notifications here if needed

    await batch.commit();

    console.log(`Order ${orderId} initialization completed`);
    return null;
  });
