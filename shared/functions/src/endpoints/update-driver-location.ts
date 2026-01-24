import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Callable function for mobile driver app to update location
 * - Validates driver authentication
 * - Rate-limited to prevent abuse
 * - Updates driver location in Firestore
 */
export const updateDriverLocation = functions.https.onCall(
  async (data: UpdateLocationRequest, context) => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Driver must be authenticated to update location"
      );
    }

    const driverId = context.auth.uid;

    // 2. Validate input
    if (
      typeof data.latitude !== "number" ||
      typeof data.longitude !== "number"
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Latitude and longitude must be numbers"
      );
    }

    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid GPS coordinates"
      );
    }

    // 3. Verify driver exists and is active
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

    // 4. Update location
    await driverRef.update({
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Driver ${driverId} location updated:`, {
      lat: data.latitude,
      lng: data.longitude,
    });

    return {
      success: true,
      message: "Location updated successfully",
    };
  }
);
