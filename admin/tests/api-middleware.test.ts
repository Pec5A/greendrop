import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Define mocks with vi.hoisted so they're available when vi.mock runs
const { mockGet, mockAdminDb, mockAdminAuth } = vi.hoisted(() => {
  const mockGet = vi.fn()
  return {
    mockGet,
    mockAdminDb: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: mockGet,
        }),
      }),
    },
    mockAdminAuth: {
      verifyIdToken: vi.fn(),
    },
  }
})

vi.mock("@/lib/firebase-admin", () => {
  return {
    adminAuth: mockAdminAuth,
    adminDb: mockAdminDb,
  }
})

// Import after mocking
import { verifyAuth, withAuth, handleApiError } from "@/lib/api-middleware"

describe("API Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("verifyAuth", () => {
    it("should return null if no Authorization header", async () => {
      const request = new NextRequest("http://localhost:3000/api/test")
      const result = await verifyAuth(request)
      expect(result).toBeNull()
    })

    it("should return null if Authorization header does not start with Bearer", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Basic token123" },
      })
      const result = await verifyAuth(request)
      expect(result).toBeNull()
    })

    it("should return user data for valid token", async () => {
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "user-123" } as any)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ role: "user" }),
      } as any)

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer valid-token" },
      })

      const result = await verifyAuth(request)
      expect(result).toEqual({ userId: "user-123", userRole: "user" })
    })

    it("should return null if user document does not exist", async () => {
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "user-123" } as any)
      mockGet.mockResolvedValue({ exists: false } as any)

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer valid-token" },
      })

      const result = await verifyAuth(request)
      expect(result).toBeNull()
    })

    it("should return null if token verification fails", async () => {
      mockAdminAuth.verifyIdToken.mockRejectedValue(new Error("Invalid token"))

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer invalid-token" },
      })

      const result = await verifyAuth(request)
      expect(result).toBeNull()
    })
  })

  describe("withAuth", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const handler = vi.fn()
      const protectedHandler = withAuth(handler)

      const request = new NextRequest("http://localhost:3000/api/test")
      const response = await protectedHandler(request)

      expect(response.status).toBe(401)
      expect(handler).not.toHaveBeenCalled()
    })

    it("should return 403 when role requirement is not met", async () => {
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "user-123" } as any)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ role: "user" }),
      } as any)

      const handler = vi.fn()
      const protectedHandler = withAuth(handler, { requiredRole: "admin" })

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer valid-token" },
      })
      const response = await protectedHandler(request)

      expect(response.status).toBe(403)
      expect(handler).not.toHaveBeenCalled()
    })

    it("should call handler when authenticated with correct role", async () => {
      mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: "admin-123" } as any)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ role: "admin" }),
      } as any)

      const handler = vi.fn().mockResolvedValue(new Response("OK"))
      const protectedHandler = withAuth(handler, { requiredRole: "admin" })

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer valid-token" },
      })
      await protectedHandler(request)

      expect(handler).toHaveBeenCalledWith(request, { userId: "admin-123", userRole: "admin" })
    })
  })

  describe("handleApiError", () => {
    it("should return 403 for permission-denied errors", () => {
      const error = { code: "permission-denied", message: "Access denied" }
      const response = handleApiError(error)

      expect(response.status).toBe(403)
    })

    it("should return 404 for not-found errors", () => {
      const error = { code: "not-found", message: "Resource not found" }
      const response = handleApiError(error)

      expect(response.status).toBe(404)
    })

    it("should return 500 for generic errors", () => {
      const error = new Error("Something went wrong")
      const response = handleApiError(error)

      expect(response.status).toBe(500)
    })
  })
})
