export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
    // Initialize Winston logger singleton (with Loki transport if configured)
    const { default: logger } = await import("./lib/logger")
    // Redirect console.log/warn/error to Winston for structured logging
    console.log = (...args: unknown[]) => logger.info(args.map(String).join(" "))
    console.warn = (...args: unknown[]) => logger.warn(args.map(String).join(" "))
    console.error = (...args: unknown[]) => logger.error(args.map(String).join(" "))
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = async (
  ...args: unknown[]
) => {
  const { captureRequestError } = await import("@sentry/nextjs")
  return (captureRequestError as (...a: unknown[]) => void)(...args)
}
