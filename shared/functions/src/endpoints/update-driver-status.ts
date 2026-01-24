import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

type DriverStatus = "online" | "offline" | "busy";

interface UpdateStatusRequest {
  status: DriverStatus;
}

/**
 * Callable function for mobile driver app to update status
 * - Validates driver authentication
 * - Updates driver status in Firestore
 * - Logs activity
 */
export const updateDriverStatus = functions.https.onCall(
  async (data: UpdateStatusRequest, context) => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Driver must be authenticated to update status"
      );
    }

    const driverId = context.auth.uid;

    // 2. Validate input
    const validStatuses: DriverStatus[] = ["online", "offline", "busy"];
    if (!validStatuses.includes(data.status)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Status must be 'online', 'offline', or 'busy'"
      );
    }

    // 3. Verify driver exists
    const driverRef = db.collection("drivers").doc(driverId);
    const driverSnap = await driverRef.get();

    if (!driverSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Driver profile not found"
      );
    }

    const driver = driverSnap.data();
    if (!driver) {
      throw new functions.https.HttpsError("internal", "Failed to read driver data");
    }

    const oldStatus = driver.status;

    // 4. Update status
    const batch = db.batch();

    batch.update(driverRef, {
      status: data.status,
      isAvailable: data.status === "online",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Log activity
    const activityLogRef = db.collection("activity-logs").doc();
    batch.set(activityLogRef, {
      entityType: "driver",
      entityId: driverId,
      type: "driver_status_changed",
      message: `Driver status changed from "${oldStatus}" to "${data.status}"`,
      userId: driverId,
      userName: driver.name,
      metadata: {
        oldStatus: oldStatus,
        newStatus: data.status,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(`Driver ${driverId} status changed: ${oldStatus} -> ${data.status}`);

    return {
      success: true,
      message: "Status updated successfully",
      status: data.status,
    };
  }
);
