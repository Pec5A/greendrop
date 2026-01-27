import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Firebase
const mockGet = vi.fn()

const createMockQueryResult = (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => ({
  empty: docs.length === 0,
  docs: docs.map((d) => ({
    id: d.id,
    data: d.data,
    ref: {
      collection: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: [] }),
        }),
      }),
    },
  })),
})

const mockChain = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: mockGet,
}

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockResolvedValue({ uid: "test-user-id" }),
  },
  adminDb: mockChain,
}))

vi.mock("@/lib/api-middleware", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => async (request: NextRequest) => {
    return handler(request, { userId: "test-user-id", userRole: "user" })
  },
  handleApiError: (error: Error) => {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  },
}))

describe("GDPR Export API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/users/export", () => {
    it("should export user profile data", async () => {
      // User profile
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: "test@example.com",
          displayName: "Test User",
          firstName: "Test",
          lastName: "User",
          role: "user",
        }),
      })

      // Empty results for other collections
      mockGet.mockResolvedValue(createMockQueryResult([]))

      const { GET } = await import("@/app/api/users/export/route")

      const request = new NextRequest("http://localhost:3000/api/users/export")
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = JSON.parse(await response.text())
      expect(data.profile).toBeDefined()
      expect(data.profile.email).toBe("test@example.com")
      expect(data.exportVersion).toBe("1.0")
    })

    it("should include orders in export", async () => {
      // User profile
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "test@example.com" }),
      })

      // Orders
      mockGet.mockResolvedValueOnce(
        createMockQueryResult([
          {
            id: "order-1",
            data: () => ({
              reference: "ORD-001",
              status: "delivered",
              total: 50,
              createdAt: new Date("2024-01-01"),
            }),
          },
        ])
      )

      // Empty results for other collections
      mockGet.mockResolvedValue(createMockQueryResult([]))

      const { GET } = await import("@/app/api/users/export/route")

      const request = new NextRequest("http://localhost:3000/api/users/export")
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = JSON.parse(await response.text())
      expect(data.orders).toBeDefined()
      expect(data.orders).toHaveLength(1)
      expect(data.orders[0].reference).toBe("ORD-001")
    })

    it("should include reviews in export", async () => {
      // User profile
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "test@example.com" }),
      })

      // Orders - empty
      mockGet.mockResolvedValueOnce(createMockQueryResult([]))

      // Reviews
      mockGet.mockResolvedValueOnce(
        createMockQueryResult([
          {
            id: "review-1",
            data: () => ({
              rating: 5,
              comment: "Great service!",
              targetType: "driver",
              createdAt: new Date("2024-01-15"),
            }),
          },
        ])
      )

      // Empty results for remaining collections
      mockGet.mockResolvedValue(createMockQueryResult([]))

      const { GET } = await import("@/app/api/users/export/route")

      const request = new NextRequest("http://localhost:3000/api/users/export")
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = JSON.parse(await response.text())
      expect(data.reviews).toBeDefined()
      expect(data.reviews).toHaveLength(1)
      expect(data.reviews[0].rating).toBe(5)
    })

    it("should set correct Content-Disposition header for download", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: "test@example.com" }),
      })
      mockGet.mockResolvedValue(createMockQueryResult([]))

      const { GET } = await import("@/app/api/users/export/route")

      const request = new NextRequest("http://localhost:3000/api/users/export")
      const response = await GET(request)

      const contentDisposition = response.headers.get("Content-Disposition")
      expect(contentDisposition).toContain("attachment")
      expect(contentDisposition).toContain("greendrop-export")
      expect(contentDisposition).toContain(".json")
    })

    it("should return valid JSON format", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: "test@example.com",
          displayName: "Test User",
        }),
      })
      mockGet.mockResolvedValue(createMockQueryResult([]))

      const { GET } = await import("@/app/api/users/export/route")

      const request = new NextRequest("http://localhost:3000/api/users/export")
      const response = await GET(request)

      const contentType = response.headers.get("Content-Type")
      expect(contentType).toBe("application/json")

      // Should not throw when parsing
      const text = await response.text()
      expect(() => JSON.parse(text)).not.toThrow()
    })
  })
})
