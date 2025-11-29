import { NextResponse } from "next/server"

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (resets on server restart - acceptable for serverless)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean expired entries periodically
function cleanExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(cleanExpiredEntries, 60_000)
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit?: number
  /** Time window in seconds */
  windowSec?: number
}

/**
 * Rate limiter middleware for API routes.
 * Uses IP-based identification with an in-memory store.
 *
 * @returns null if request is allowed, NextResponse if rate limited
 */
export function rateLimit(request: Request, options: RateLimitOptions = {}): NextResponse | null {
  const { limit = 60, windowSec = 60 } = options

  // Extract client IP
  const forwarded = (request.headers as any).get?.("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "unknown"
  const key = `${ip}:${new URL(request.url).pathname}`

  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowSec * 1000 })
    return null
  }

  entry.count++

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Trop de requetes. Veuillez reessayer plus tard.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
        },
      }
    )
  }

  return null
}
