import * as functions from "firebase-functions";
import { Sentry } from "../sentry";

interface MobileLogEntry {
  level: string;
  event: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  metadata?: Record<string, unknown>;
}

/**
 * HTTP endpoint to receive batches of mobile app logs and push them to Loki.
 *
 * Auth: API key via x-api-key header (MOBILE_LOG_API_KEY env var).
 * Max 100 entries per batch.
 * Labels: app="greendrop-mobile" (separate from admin logs).
 */
export const logMobileEvents = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Auth check
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.MOBILE_LOG_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Validate body
  const { events } = req.body as { events?: MobileLogEntry[] };

  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: "events array is required and must not be empty" });
    return;
  }

  if (events.length > 100) {
    res.status(400).json({ error: "Maximum 100 events per batch" });
    return;
  }

  // Push to Loki
  const lokiHost = process.env.LOKI_HOST;
  const lokiUserId = process.env.LOKI_USER_ID;
  const lokiToken = process.env.GRAFANA_LOKI_TOKEN;

  if (!lokiHost || !lokiToken) {
    console.warn("Loki config missing — skipping mobile log push");
    res.status(503).json({ error: "Logging service not configured" });
    return;
  }

  try {
    // Build Loki streams
    const values: [string, string][] = events.map((entry) => {
      const ts = entry.timestamp
        ? new Date(entry.timestamp).getTime() * 1_000_000
        : Date.now() * 1_000_000;

      const logLine = JSON.stringify({
        level: entry.level || "info",
        event: entry.event,
        userId: entry.userId || "",
        sessionId: entry.sessionId || "",
        appVersion: entry.appVersion || "",
        osVersion: entry.osVersion || "",
        deviceModel: entry.deviceModel || "",
        ...(entry.metadata || {}),
      });

      return [String(ts), logLine];
    });

    const lokiPayload = {
      streams: [
        {
          stream: { app: "greendrop-mobile" },
          values,
        },
      ],
    };

    const authHeader = `Basic ${Buffer.from(`${lokiUserId}:${lokiToken}`).toString("base64")}`;

    const response = await fetch(`${lokiHost}/loki/api/v1/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(lokiPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Loki push failed: ${response.status} ${text}`);
    }

    console.log(`Pushed ${events.length} mobile events to Loki`);
    res.status(200).json({ success: true, count: events.length });
  } catch (error) {
    console.error("Failed to push mobile logs:", error);
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to push logs" });
  }
});
