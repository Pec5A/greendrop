import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Sentry } from "../sentry";

const db = admin.firestore();

/**
 * Triggered when order status changes
 * - Logs activity
 * - Sends notifications to user and driver
 * - Updates driver availability if order is completed/cancelled
 */
export const onOrderStatusChange = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Check if status changed
    if (before.status === after.status) {
      return null;
    }

    try {
      const statusChange = {
        from: before.status,
        to: after.status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      console.log(`Order ${orderId} status changed:`, statusChange);

      const batch = db.batch();

      // 1. Log activity
      const activityLogRef = db.collection("activityLogs").doc();
      batch.set(activityLogRef, {
        entityType: "order",
        entityId: orderId,
        type: "order_updated",
        message: `Order status changed from "${before.status}" to "${after.status}"`,
        userId: after.userId,
        metadata: {
          oldStatus: before.status,
          newStatus: after.status,
          driverId: after.driverId || null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Send notification to user
      const userNotifRef = db.collection("notifications").doc();
      batch.set(userNotifRef, {
        userId: after.userId,
        title: `Order ${after.status}`,
        message: `Your order #${orderId.slice(-6).toUpperCase()} is now ${after.status}`,
        type: "order_update",
        orderId: orderId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Admin notification on cancellation
      if (after.status === "cancelled") {
        const adminNotifRef = db.collection("notifications").doc();
        batch.set(adminNotifRef, {
          target: "admin",
          type: "warning",
          category: "order",
          title: "Commande annulée",
          message: `Commande #${orderId.slice(-6).toUpperCase()} annulée par ${after.userName || after.userId}`,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 4. Admin notification on delivery
      if (after.status === "delivered") {
        const adminNotifRef = db.collection("notifications").doc();
        batch.set(adminNotifRef, {
          target: "admin",
          type: "success",
          category: "order",
          title: "Commande livrée",
          message: `Commande #${orderId.slice(-6).toUpperCase()} livrée avec succès`,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 5. If order is completed or cancelled, release driver
      if (
        (after.status === "delivered" || after.status === "cancelled") &&
        after.driverId
      ) {
        const driverRef = db.collection("drivers").doc(after.driverId);
        batch.update(driverRef, {
          isAvailable: true,
          currentOrderId: null,
          status: "online",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify driver
        const driverNotifRef = db.collection("notifications").doc();
        batch.set(driverNotifRef, {
          userId: after.driverId,
          title: "Delivery Completed",
          message: `Order #${orderId.slice(-6).toUpperCase()} has been ${after.status}`,
          type: "delivery_update",
          orderId: orderId,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 6. If order is assigned to driver, notify driver
      if (after.status === "shipped" && after.driverId && !before.driverId) {
        const driverNotifRef = db.collection("notifications").doc();
        batch.set(driverNotifRef, {
          userId: after.driverId,
          title: "New Delivery Assignment",
          message: `You have been assigned order #${orderId.slice(-6).toUpperCase()}`,
          type: "delivery_assignment",
          orderId: orderId,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      console.log(`Order ${orderId} automation completed`);
      return null;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
