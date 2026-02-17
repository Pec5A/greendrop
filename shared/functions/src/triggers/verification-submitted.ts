import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Sentry } from "../sentry";

const db = admin.firestore();

/**
 * Triggered when a verification document is created
 * - Sends notification to admin dashboard
 */
export const onVerificationSubmitted = functions.firestore
  .document("verifications/{verificationId}")
  .onWrite(async (change, context) => {
    // Only fire on creation (after exists, before doesn't)
    if (change.before.exists || !change.after.exists) {
      return null;
    }

    const verification = change.after.data()!;
    const verificationId = context.params.verificationId;

    try {
      console.log(`New verification submitted: ${verificationId}`);

      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        target: "admin",
        type: "alert",
        category: "verification",
        title: "Nouvelle vérification",
        message: `${verification.userName || verification.userId || "Utilisateur"} — ${verification.type || "document"}`,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
