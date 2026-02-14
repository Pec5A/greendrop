import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Sentry } from "../sentry";

const db = admin.firestore();

/**
 * Syncs the drivers collection when a user document is created or updated.
 *
 * - If user has role "driver" and no drivers/{uid} doc exists → creates it
 * - If user role changes away from "driver" → marks driver doc as offline
 * - Keeps driver name/email/phone in sync with user profile
 */
export const onUserWriteSyncDriver = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;

    // User deleted — mark driver offline
    if (!after) {
      if (before?.role === "driver") {
        const driverRef = db.collection("drivers").doc(userId);
        const driverSnap = await driverRef.get();
        if (driverSnap.exists) {
          await driverRef.update({
            status: "offline",
            isAvailable: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
      return null;
    }

    const isDriver = after.role === "driver";
    const wasDriver = before?.role === "driver";

    // Role changed away from driver — set offline
    if (wasDriver && !isDriver) {
      const driverRef = db.collection("drivers").doc(userId);
      const driverSnap = await driverRef.get();
      if (driverSnap.exists) {
        await driverRef.update({
          status: "offline",
          isAvailable: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return null;
    }

    // Not a driver — nothing to do
    if (!isDriver) return null;

    try {
      const driverRef = db.collection("drivers").doc(userId);
      const driverSnap = await driverRef.get();

      if (!driverSnap.exists) {
        // Create driver document
        await driverRef.set({
          id: userId,
          driverId: userId,
          name: after.name || "",
          email: after.email || "",
          phone: after.phone || "",
          status: "offline",
          vehicleType: "bike",
          rating: 5.0,
          completedDeliveries: 0,
          currentOrderId: null,
          isAvailable: false,
          location: {
            lat: 0,
            lng: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Created driver doc for user ${userId}`);
      } else {
        // Sync profile fields if they changed
        const updates: Record<string, unknown> = {};
        const driver = driverSnap.data()!;

        if (after.name && after.name !== driver.name) updates.name = after.name;
        if (after.email && after.email !== driver.email) updates.email = after.email;
        if (after.phone && after.phone !== driver.phone) updates.phone = after.phone;

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          await driverRef.update(updates);
          console.log(`Synced driver profile for user ${userId}:`, Object.keys(updates));
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to sync driver for user ${userId}:`, error);
      Sentry.captureException(error);
      return null;
    }
  });
