import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Triggered when driver location updates
 * - Calculates distance from delivery address
 * - Sends notification to user when driver is nearby (< 500m)
 * - Logs location history for analytics
 */
export const onDriverLocationUpdate = functions.firestore
  .document("drivers/{driverId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const driverId = context.params.driverId;

    // Check if location changed
    const locationChanged =
      before.location?.latitude !== after.location?.latitude ||
      before.location?.longitude !== after.location?.longitude;

    if (!locationChanged || !after.currentOrderId) {
      return null;
    }

    console.log(`Driver ${driverId} location updated:`, after.location);

    // Get current order
    const orderRef = db.collection("orders").doc(after.currentOrderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error(`Order ${after.currentOrderId} not found for driver ${driverId}`);
      return null;
    }

    const order = orderSnap.data();
    if (!order) return null;

    // Update order with driver location
    await orderRef.update({
      driverLocation: after.location,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Calculate distance to delivery address (simplified Haversine formula)
    if (order.addresses && order.addresses.length > 0) {
      const deliveryAddress = order.addresses[order.addresses.length - 1]; // Last address is delivery
      
      if (deliveryAddress.lat && deliveryAddress.lng) {
        const distance = calculateDistance(
          after.location.latitude,
          after.location.longitude,
          deliveryAddress.lat,
          deliveryAddress.lng
        );

        console.log(`Driver is ${distance}m from delivery address`);

        // If driver is within 500m, notify user
        if (distance < 500 && !order.notifiedNearby) {
          const notifRef = db.collection("notifications").doc();
          await notifRef.set({
            userId: order.userId,
            title: "Driver Nearby",
            message: `Your driver is approaching (${Math.round(distance)}m away)`,
            type: "driver_nearby",
            orderId: order.id,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Mark as notified to avoid spam
          await orderRef.update({
            notifiedNearby: true,
          });
        }
      }
    }

    return null;
  });

/**
 * Calculate distance between two GPS coordinates (meters)
 * Using simplified Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
