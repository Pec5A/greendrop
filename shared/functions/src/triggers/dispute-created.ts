import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Sentry } from "../sentry";

const db = admin.firestore();

/**
 * Triggered when a new dispute is created
 * - Sends notification to admin dashboard
 */
export const onDisputeCreated = functions.firestore
  .document("disputes/{disputeId}")
  .onCreate(async (snapshot, context) => {
    const dispute = snapshot.data();
    const disputeId = context.params.disputeId;

    try {
      console.log(`New dispute created: ${disputeId}`);

      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        target: "admin",
        type: "alert",
        category: "order",
        title: "Nouveau litige",
        message: `Litige sur commande #${(dispute.orderId || disputeId).slice(-6).toUpperCase()} — ${dispute.reason || "Raison non précisée"}`,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
