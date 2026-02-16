import winston from "winston"
import LokiTransport from "winston-loki"

const isProd = process.env.NODE_ENV === "production"

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

// Loki transport: only if all env vars are present
if (process.env.LOKI_HOST && process.env.LOKI_USER_ID && process.env.GRAFANA_LOKI_TOKEN) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_HOST,
      basicAuth: `${process.env.LOKI_USER_ID}:${process.env.GRAFANA_LOKI_TOKEN}`,
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

export default logger
