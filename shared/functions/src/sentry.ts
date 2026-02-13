import * as Sentry from "@sentry/node"

let initialized = false

export function initSentry() {
  if (initialized) return

  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    console.log("[Sentry] No DSN configured, skipping initialization")
    return
  }

  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || "production",
  })

  initialized = true
  console.log("[Sentry] Initialized for Cloud Functions")
}

export { Sentry }
