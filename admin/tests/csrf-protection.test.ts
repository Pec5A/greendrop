import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies before importing
vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: vi.fn().mockResolvedValue({ uid: "test-user" }) },
  adminDb: {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ role: "admin" }) }),
    }),
  },
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue(null),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

vi.mock("@/lib/logger", () => {
  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
    http: vi.fn(),
    info: vi.fn(),
  }
  return { default: logger, pushToLoki: vi.fn() }
})

describe("CSRF Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate a CSRF token for a session", async () => {
    const { generateCsrfToken } = await import("@/lib/api-middleware")
    const token = generateCsrfToken("session-123")
    expect(token).toBeDefined()
    expect(typeof token).toBe("string")
    expect(token.length).toBe(64) // hex SHA-256
  })

  it("should generate different tokens for different sessions", async () => {
    const { generateCsrfToken } = await import("@/lib/api-middleware")
    const token1 = generateCsrfToken("session-1")
    const token2 = generateCsrfToken("session-2")
    expect(token1).not.toBe(token2)
  })

  it("should verify a valid CSRF token", async () => {
    const { generateCsrfToken, verifyCsrfToken } = await import("@/lib/api-middleware")
    const token = generateCsrfToken("session-123")
    expect(verifyCsrfToken(token, "session-123")).toBe(true)
  })

  it("should reject an invalid CSRF token", async () => {
    const { verifyCsrfToken } = await import("@/lib/api-middleware")
    const fakeToken = "a".repeat(64)
    expect(verifyCsrfToken(fakeToken, "session-123")).toBe(false)
  })

  it("should reject a token for a different session", async () => {
    const { generateCsrfToken, verifyCsrfToken } = await import("@/lib/api-middleware")
    const token = generateCsrfToken("session-1")
    expect(verifyCsrfToken(token, "session-2")).toBe(false)
  })

  it("should generate consistent tokens within the same hour window", async () => {
    const { generateCsrfToken } = await import("@/lib/api-middleware")
    const token1 = generateCsrfToken("session-123")
    const token2 = generateCsrfToken("session-123")
    expect(token1).toBe(token2)
  })
})
