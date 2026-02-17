import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Sentry } from "../sentry";

const db = admin.firestore();

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  team: string;
}

/**
 * Health check that runs every 5 minutes.
 * Evaluates platform health thresholds and sends alerts via:
 * - Discord webhook (real-time)
 * - Admin notifications in Firestore (in-app)
 * - FCM push to admin users
 *
 * Deduplicates alerts: won't re-send the same alert within 30 minutes.
 */
export const healthCheck = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    try {
      const alerts: Alert[] = [];

      // ── 1. Check drivers online ─────────────────────
      const driversSnap = await db.collection("drivers").get();
      const drivers = driversSnap.docs.map((d) => d.data());
      const onlineDrivers = drivers.filter((d) => d.status === "online").length;
      const busyDrivers = drivers.filter((d) => d.status === "busy").length;
      const activeDrivers = onlineDrivers + busyDrivers;

      if (activeDrivers === 0 && drivers.length > 0) {
        alerts.push({
          id: "no-drivers-online",
          severity: "critical",
          title: "Aucun chauffeur en ligne",
          message: `0 chauffeurs actifs sur ${drivers.length} total. Les commandes ne peuvent pas être livrées.`,
          team: "operations",
        });
      }

      // Driver utilization > 90%
      if (activeDrivers > 0) {
        const utilization = Math.round((busyDrivers / activeDrivers) * 100);
        if (utilization > 90) {
          alerts.push({
            id: "driver-overload",
            severity: "warning",
            title: "Chauffeurs surchargés",
            message: `Utilisation à ${utilization}% (${busyDrivers} busy / ${activeDrivers} actifs). Risque de retards.`,
            team: "operations",
          });
        }
      }

      // ── 2. Check disputes ───────────────────────────
      const openDisputesSnap = await db.collection("disputes").where("status", "==", "open").get();
      if (openDisputesSnap.size > 10) {
        alerts.push({
          id: "high-disputes",
          severity: "critical",
          title: "Trop de litiges ouverts",
          message: `${openDisputesSnap.size} litiges ouverts nécessitent une attention immédiate.`,
          team: "support",
        });
      }

      // ── 3. Check KYC backlog ────────────────────────
      const pendingVerifSnap = await db.collection("verifications").where("status", "==", "pending").get();
      if (pendingVerifSnap.size > 20) {
        alerts.push({
          id: "kyc-backlog",
          severity: "warning",
          title: "File d'attente KYC élevée",
          message: `${pendingVerifSnap.size} vérifications en attente. Priorisez le traitement.`,
          team: "compliance",
        });
      }

      // ── 4. Check delivery on-time rate ──────────────
      const ordersSnap = await db.collection("orders").get();
      const orders = ordersSnap.docs.map((d) => d.data());

      let deliveredCount = 0;
      let onTimeCount = 0;
      let cancelledCount = 0;
      let shippedCount = 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let todayOrders = 0;
      let todayRevenue = 0;

      for (const order of orders) {
        const status = order.status || "unknown";
        if (status === "shipped") shippedCount++;
        if (status === "cancelled") cancelledCount++;

        const createdAt = order.createdAt?.toDate?.() ?? new Date(order.createdAt);
        if (createdAt >= todayStart) {
          todayOrders++;
          todayRevenue += order.totalAmount || 0;
        }

        if (status === "delivered") {
          deliveredCount++;
          if (order.deliveredAt && order.estimatedDelivery) {
            const delivered = order.deliveredAt.toDate?.() ?? new Date(order.deliveredAt);
            const estimated = order.estimatedDelivery.toDate?.() ?? new Date(order.estimatedDelivery);
            if (delivered <= estimated) onTimeCount++;
          }
        }
      }

      if (deliveredCount > 5) {
        const onTimeRate = Math.round((onTimeCount / deliveredCount) * 100);
        if (onTimeRate < 80) {
          alerts.push({
            id: "low-delivery-rate",
            severity: "warning",
            title: "Taux de livraison à temps bas",
            message: `Seulement ${onTimeRate}% de livraisons à temps (seuil: 80%). Vérifiez les chauffeurs.`,
            team: "operations",
          });
        }
      }

      // ── 5. Check revenue (after 12h, 0€ is suspect) ─
      const currentHour = new Date().getHours();
      if (currentHour >= 12 && todayRevenue === 0 && orders.length > 10) {
        alerts.push({
          id: "zero-revenue",
          severity: "warning",
          title: "Aucun revenu aujourd'hui",
          message: `0€ de revenu après 12h. Vérifiez que le système de paiement fonctionne.`,
          team: "business",
        });
      }

      // ── 6. Check stale shipped orders (stuck > 2h) ──
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      let staleShipped = 0;
      for (const order of orders) {
        if (order.status === "shipped") {
          const shippedAt = order.shippedAt?.toDate?.() ?? order.updatedAt?.toDate?.() ?? null;
          if (shippedAt && shippedAt < twoHoursAgo) staleShipped++;
        }
      }
      if (staleShipped > 0) {
        alerts.push({
          id: "stale-deliveries",
          severity: "warning",
          title: "Livraisons bloquées",
          message: `${staleShipped} commande(s) en statut "shipped" depuis plus de 2h. Possible problème chauffeur.`,
          team: "operations",
        });
      }

      // ── 7. Check signups (0 after 24h is suspect) ───
      const usersSnap = await db.collection("users").get();
      const users = usersSnap.docs.map((d) => d.data());
      let newUsersToday = 0;
      for (const user of users) {
        const createdAt = user.createdAt?.toDate?.() ?? new Date(user.createdAt);
        if (createdAt >= todayStart) newUsersToday++;
      }

      if (currentHour >= 18 && newUsersToday === 0 && users.length > 20) {
        alerts.push({
          id: "no-signups",
          severity: "info",
          title: "Aucune inscription aujourd'hui",
          message: `0 nouvelles inscriptions après 18h. Vérifiez l'acquisition.`,
          team: "growth",
        });
      }

      // ── Process alerts ──────────────────────────────
      if (alerts.length === 0) {
        console.log("[HealthCheck] All systems nominal");
        return null;
      }

      // Deduplicate: skip alerts sent in the last 30 minutes
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentAlertsSnap = await db
        .collection("alertHistory")
        .where("sentAt", ">=", thirtyMinAgo)
        .get();
      const recentAlertIds = new Set(recentAlertsSnap.docs.map((d) => d.data().alertId));

      const newAlerts = alerts.filter((a) => !recentAlertIds.has(a.id));

      if (newAlerts.length === 0) {
        console.log("[HealthCheck] Alerts already sent recently, skipping");
        return null;
      }

      // Send to Discord
      await sendDiscordAlerts(newAlerts);

      // Save to admin notifications + alert history
      const batch = db.batch();
      for (const alert of newAlerts) {
        // Admin notification (in-app)
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          target: "admin",
          type: alert.severity === "critical" ? "alert" : "warning",
          category: "monitoring",
          title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          message: alert.message,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Alert history (for deduplication)
        const histRef = db.collection("alertHistory").doc();
        batch.set(histRef, {
          alertId: alert.id,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          team: alert.team,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      // Push notification to admin users
      await sendAdminPush(newAlerts);

      console.log(`[HealthCheck] Sent ${newAlerts.length} alerts`);
      return null;
    } catch (error) {
      console.error("[HealthCheck] Error:", error);
      Sentry.captureException(error);
      return null;
    }
  });

// ── Discord webhook ─────────────────────────────────
async function sendDiscordAlerts(alerts: Alert[]) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[HealthCheck] No DISCORD_WEBHOOK_URL configured");
    return;
  }

  const severityEmoji: Record<string, string> = {
    critical: "🔴",
    warning: "🟡",
    info: "🔵",
  };

  const severityColor: Record<string, number> = {
    critical: 0xff0000,
    warning: 0xffaa00,
    info: 0x0099ff,
  };

  const embeds = alerts.map((alert) => ({
    title: `${severityEmoji[alert.severity]} ${alert.title}`,
    description: alert.message,
    color: severityColor[alert.severity],
    fields: [
      { name: "Sévérité", value: alert.severity.toUpperCase(), inline: true },
      { name: "Équipe", value: alert.team, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "GreenDrop Health Check" },
  }));

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "GreenDrop Monitoring",
        avatar_url: "https://cdn-icons-png.flaticon.com/512/4149/4149685.png",
        embeds,
      }),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Discord webhook error:", error);
  }
}

// ── FCM push to admin users ─────────────────────────
async function sendAdminPush(alerts: Alert[]) {
  try {
    const adminsSnap = await db
      .collection("users")
      .where("role", "in", ["admin", "supervisor"])
      .get();

    const tokens: string[] = [];
    for (const doc of adminsSnap.docs) {
      const fcmTokens = doc.data().fcmTokens || [];
      tokens.push(...fcmTokens);
    }

    if (tokens.length === 0) return;

    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const alertToSend = criticalAlerts.length > 0 ? criticalAlerts[0] : alerts[0];

    const title = alerts.length > 1
      ? `⚠️ ${alerts.length} alertes monitoring`
      : `⚠️ ${alertToSend.title}`;

    const body = alerts.length > 1
      ? alerts.map((a) => a.title).join(", ")
      : alertToSend.message;

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { type: "monitoring_alert", severity: alertToSend.severity },
    });
  } catch (error) {
    console.error("Admin push notification error:", error);
  }
}
