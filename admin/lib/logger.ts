import winston from "winston"
import LokiTransport from "winston-loki"

const isProd = process.env.NODE_ENV === "production"
const isVercel = !!process.env.VERCEL

const lokiHost = process.env.LOKI_HOST
const lokiUserId = process.env.LOKI_USER_ID
const lokiToken = process.env.GRAFANA_LOKI_TOKEN
const lokiEnabled = !!(lokiHost && lokiUserId && lokiToken)

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProd
      ? winston.format.combine(winston.format.timestamp(), winston.format.json())
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "HH:mm:ss" }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
            return `${timestamp} ${level}: ${message}${metaStr}`
          })
        ),
  }),
]

// Loki transport for non-serverless environments (local dev with env vars)
if (lokiEnabled && !isVercel) {
  transports.push(
    new LokiTransport({
      host: lokiHost!,
      basicAuth: `${lokiUserId}:${lokiToken}`,
      labels: { app: "greendrop-admin", environment: isProd ? "production" : "development" },
      json: true,
      batching: true,
      interval: 5,
      replaceTimestamp: true,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      onConnectionError: (err: Error) => console.error("[Loki] Connection error:", err.message),
    })
  )
}

const logger = winston.createLogger({
  level: isProd ? "http" : "debug",
  defaultMeta: { service: "greendrop-admin" },
  transports,
})

/**
 * Push a log directly to Loki via fetch (for serverless environments).
 * Returns a promise that must be awaited before the function exits.
 */
export async function pushToLoki(level: string, message: string, meta: Record<string, unknown> = {}) {
  if (!lokiEnabled) return

  const logEntry = JSON.stringify({ level, message, ...meta, service: "greendrop-admin" })
  const timestamp = (Date.now() * 1_000_000).toString()

  try {
    await fetch(`${lokiHost}/loki/api/v1/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${lokiUserId}:${lokiToken}`)}`,
      },
      body: JSON.stringify({
        streams: [
          {
            stream: {
              app: "greendrop-admin",
              environment: isProd ? "production" : "development",
              level,
            },
            values: [[timestamp, logEntry]],
          },
        ],
      }),
    })
  } catch {
    // Silently fail — don't break the request
  }
}

export default logger
