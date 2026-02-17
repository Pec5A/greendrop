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

      // ── Operations metrics ──────────────────────────
      let cancelledCount = 0;
      let shippedCount = 0;
      let totalDeliveryTimeMs = 0;
      let deliveryTimeCount = 0;
      const ordersByZone: Record<string, number> = {};

      for (const order of orders) {
        const status = order.status || "unknown";
        if (status === "cancelled") cancelledCount++;
        if (status === "shipped") shippedCount++;

        // Avg delivery time (createdAt → deliveredAt)
        if (status === "delivered" && order.deliveredAt && order.createdAt) {
          const created = order.createdAt.toDate?.() ?? new Date(order.createdAt);
          const delivered = order.deliveredAt.toDate?.() ?? new Date(order.deliveredAt);
          const diffMs = delivered.getTime() - created.getTime();
          if (diffMs > 0) {
            totalDeliveryTimeMs += diffMs;
            deliveryTimeCount++;
          }
        }

        // Orders by zone (city)
        const zone = (order.city || order.deliveryCity || "unknown").toLowerCase().replace(/\s+/g, "_");
        ordersByZone[zone] = (ordersByZone[zone] || 0) + 1;
      }

      const avgDeliveryMinutes = deliveryTimeCount > 0 ? Math.round(totalDeliveryTimeMs / deliveryTimeCount / 60000) : 0;
      metrics.push({ name: `${prefix}.operations.avg_delivery_time`, value: avgDeliveryMinutes, interval: 300, time: now });
      metrics.push({ name: `${prefix}.operations.active_deliveries`, value: shippedCount, interval: 300, time: now });

      const deliverySuccessRate = (deliveredCount + cancelledCount) > 0
        ? Math.round((deliveredCount / (deliveredCount + cancelledCount)) * 100)
        : 100;
      metrics.push({ name: `${prefix}.operations.delivery_success_rate`, value: deliverySuccessRate, interval: 300, time: now });

      for (const [zone, count] of Object.entries(ordersByZone)) {
        metrics.push({ name: `${prefix}.operations.orders_by_zone.${zone}`, value: count, interval: 300, time: now });
      }

      // ── Users ──────────────────────────────────────
      const usersSnap = await db.collection("users").get();
      const users = usersSnap.docs.map((d) => d.data());

      let verifiedUsers = 0;
      let newUsersToday = 0;
      let usersWithOrders = 0;
      let dauCount = 0;
      let wauCount = 0;
      let mauCount = 0;

      const now24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Build a set of userIds who placed orders in various windows
      const userLastOrder: Record<string, Date> = {};
      const usersWithAnyOrder = new Set<string>();
      for (const order of orders) {
        const uid = order.userId || order.customerId;
        if (!uid) continue;
        usersWithAnyOrder.add(uid);
        const createdAt = order.createdAt?.toDate?.() ?? new Date(order.createdAt);
        if (!userLastOrder[uid] || createdAt > userLastOrder[uid]) {
          userLastOrder[uid] = createdAt;
        }
      }

      for (const user of users) {
        if (user.status === "verified") verifiedUsers++;
        const createdAt = user.createdAt?.toDate?.() ?? new Date(user.createdAt);
        if (createdAt >= todayStart) newUsersToday++;
        if (usersWithAnyOrder.has(user.id || user.uid)) usersWithOrders++;

        const uid = user.id || user.uid;
        const lastOrder = uid ? userLastOrder[uid] : undefined;
        if (lastOrder) {
          if (lastOrder >= now24h) dauCount++;
          if (lastOrder >= now7d) wauCount++;
          if (lastOrder >= now30d) mauCount++;
        }
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

      // Driver utilization: busy / (online + busy) * 100
      const activeDrivers = onlineDrivers + busyDrivers;
      const driverUtilization = activeDrivers > 0 ? Math.round((busyDrivers / activeDrivers) * 100) : 0;
      metrics.push({ name: `${prefix}.operations.driver_utilization`, value: driverUtilization, interval: 300, time: now });

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

      let verificationsApprovedToday = 0;
      for (const v of verifications) {
        if (v.status === "approved") {
          const updatedAt = v.updatedAt?.toDate?.() ?? v.reviewedAt?.toDate?.() ?? null;
          if (updatedAt && updatedAt >= todayStart) verificationsApprovedToday++;
        }
      }

      metrics.push({ name: `${prefix}.verifications.pending`, value: pendingVerifications, interval: 300, time: now });
      metrics.push({ name: `${prefix}.verifications.approved`, value: approvedVerifications, interval: 300, time: now });
      metrics.push({ name: `${prefix}.verifications.rejected`, value: rejectedVerifications, interval: 300, time: now });

      // ── Funnel metrics ──────────────────────────────────
      const signupToOrderRate = users.length > 0 ? Math.round((usersWithOrders / users.length) * 100) : 0;
      const verificationRate = users.length > 0 ? Math.round((verifiedUsers / users.length) * 100) : 0;

      metrics.push({ name: `${prefix}.funnel.signup_to_order_rate`, value: signupToOrderRate, interval: 300, time: now });
      metrics.push({ name: `${prefix}.funnel.verification_rate`, value: verificationRate, interval: 300, time: now });
      metrics.push({ name: `${prefix}.funnel.signups_today`, value: newUsersToday, interval: 300, time: now });
      metrics.push({ name: `${prefix}.funnel.verifications_today`, value: verificationsApprovedToday, interval: 300, time: now });
      metrics.push({ name: `${prefix}.funnel.dau`, value: dauCount, interval: 300, time: now });
      metrics.push({ name: `${prefix}.funnel.wau`, value: wauCount, interval: 300, time: now });
      metrics.push({ name: `${prefix}.funnel.mau`, value: mauCount, interval: 300, time: now });

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
