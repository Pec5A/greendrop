import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Sentry } from "../sentry";

const db = admin.firestore();

interface GraphiteMetric {
  name: string;
  value: number;
  interval: number;
  time: number;
}

/**
 * Pushes business metrics to Grafana Cloud every 5 minutes.
 *
 * Metrics collected:
 * - orders (total, by status, revenue)
 * - users (total, verified, new today)
 * - drivers (total, online, busy)
 * - verifications (pending, approved, rejected)
 * - deliveries (on-time rate, avg duration)
 * - disputes (open count)
 */
export const pushMetrics = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    const grafanaUrl = process.env.GRAFANA_URL;
    const grafanaUser = process.env.GRAFANA_USER;
    const grafanaKey = process.env.GRAFANA_API_KEY;

    if (!grafanaUrl || !grafanaKey) {
      console.warn("Grafana config missing — skipping metrics push");
      return null;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const metrics: GraphiteMetric[] = [];
      const prefix = "greendrop";

      // ── Orders ──────────────────────────────────────
      const ordersSnap = await db.collection("orders").get();
      const orders = ordersSnap.docs.map((d) => d.data());

      const ordersByStatus: Record<string, number> = {};
      let totalRevenue = 0;
      let todayOrders = 0;
      let todayRevenue = 0;
      let deliveredCount = 0;
      let onTimeCount = 0;

      for (const order of orders) {
        const status = order.status || "unknown";
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
        totalRevenue += order.totalAmount || 0;

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
            if (delivered <= estimated) {
              onTimeCount++;
            }
          }
        }
      }

      metrics.push({ name: `${prefix}.orders.total`, value: orders.length, interval: 300, time: now });
      metrics.push({ name: `${prefix}.orders.today`, value: todayOrders, interval: 300, time: now });
      metrics.push({ name: `${prefix}.orders.revenue.total`, value: totalRevenue, interval: 300, time: now });
      metrics.push({ name: `${prefix}.orders.revenue.today`, value: todayRevenue, interval: 300, time: now });

      for (const [status, count] of Object.entries(ordersByStatus)) {
        metrics.push({ name: `${prefix}.orders.status.${status}`, value: count, interval: 300, time: now });
      }

      const onTimeRate = deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 100;
      metrics.push({ name: `${prefix}.orders.on_time_rate`, value: onTimeRate, interval: 300, time: now });

      // ── Users ──────────────────────────────────────
      const usersSnap = await db.collection("users").get();
      const users = usersSnap.docs.map((d) => d.data());

      let verifiedUsers = 0;
      let newUsersToday = 0;

      for (const user of users) {
        if (user.status === "verified") verifiedUsers++;
        const createdAt = user.createdAt?.toDate?.() ?? new Date(user.createdAt);
        if (createdAt >= todayStart) newUsersToday++;
      }

      metrics.push({ name: `${prefix}.users.total`, value: users.length, interval: 300, time: now });
      metrics.push({ name: `${prefix}.users.verified`, value: verifiedUsers, interval: 300, time: now });
      metrics.push({ name: `${prefix}.users.new_today`, value: newUsersToday, interval: 300, time: now });

      // ── Drivers ──────────────────────────────────────
      const driversSnap = await db.collection("drivers").get();
      const drivers = driversSnap.docs.map((d) => d.data());

      let onlineDrivers = 0;
      let busyDrivers = 0;

      for (const driver of drivers) {
        if (driver.status === "online") onlineDrivers++;
        if (driver.status === "busy") busyDrivers++;
      }

      metrics.push({ name: `${prefix}.drivers.total`, value: drivers.length, interval: 300, time: now });
      metrics.push({ name: `${prefix}.drivers.online`, value: onlineDrivers, interval: 300, time: now });
      metrics.push({ name: `${prefix}.drivers.busy`, value: busyDrivers, interval: 300, time: now });

      // ── Verifications ──────────────────────────────────────
      const verificationsSnap = await db.collection("verifications").get();
      const verifications = verificationsSnap.docs.map((d) => d.data());

      let pendingVerifications = 0;
      let approvedVerifications = 0;
      let rejectedVerifications = 0;

      for (const v of verifications) {
        if (v.status === "pending") pendingVerifications++;
        else if (v.status === "approved") approvedVerifications++;
        else if (v.status === "rejected") rejectedVerifications++;
      }

      metrics.push({ name: `${prefix}.verifications.pending`, value: pendingVerifications, interval: 300, time: now });
      metrics.push({ name: `${prefix}.verifications.approved`, value: approvedVerifications, interval: 300, time: now });
      metrics.push({ name: `${prefix}.verifications.rejected`, value: rejectedVerifications, interval: 300, time: now });

      // ── Disputes ──────────────────────────────────────
      const disputesSnap = await db.collection("disputes").where("status", "==", "open").get();
      metrics.push({ name: `${prefix}.disputes.open`, value: disputesSnap.size, interval: 300, time: now });

      // ── Shops ──────────────────────────────────────
      const shopsSnap = await db.collection("shops").get();
      metrics.push({ name: `${prefix}.shops.total`, value: shopsSnap.size, interval: 300, time: now });

      // ── Push to Grafana Cloud (Graphite endpoint) ──
      const response = await fetch(`${grafanaUrl}/graphite/metrics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${grafanaUser}:${grafanaKey}`,
        },
        body: JSON.stringify(metrics),
      });

      if (!response.ok) {
        throw new Error(`Grafana push failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Pushed ${metrics.length} metrics to Grafana Cloud`);
      return null;
    } catch (error) {
      console.error("Failed to push metrics:", error);
      Sentry.captureException(error);
      return null;
    }
  });
