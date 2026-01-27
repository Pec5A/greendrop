import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Firebase
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockAdd = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockStartAfter = vi.fn()

const mockChain = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnValue({
    id: "new-order-id",
    get: mockGet,
    set: mockSet,
  }),
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  get: mockGet,
  add: mockAdd,
  startAfter: mockStartAfter,
}

mockWhere.mockReturnValue(mockChain)
mockOrderBy.mockReturnValue(mockChain)
mockLimit.mockReturnValue(mockChain)
mockStartAfter.mockReturnValue(mockChain)

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

describe("Orders API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockSet.mockReset()
    mockAdd.mockReset()
  })

  describe("POST /api/orders", () => {
    it("should validate required fields", async () => {
      const { POST } = await import("@/app/api/orders/route")

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.message).toContain("shopId")
    })

    it("should validate delivery address", async () => {
      const { POST } = await import("@/app/api/orders/route")

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          shopId: "shop-123",
          items: [{ productId: "prod-1", quantity: 2 }],
          deliveryAddress: "123 Main St",
          // Missing deliveryLocation
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.message).toContain("livraison")
    })

    it("should return 404 if shop not found", async () => {
      mockGet.mockResolvedValueOnce({ exists: false })

      const { POST } = await import("@/app/api/orders/route")

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          shopId: "nonexistent-shop",
          items: [{ productId: "prod-1", quantity: 2 }],
          deliveryAddress: "123 Main St",
          deliveryLocation: { latitude: 48.8566, longitude: 2.3522 },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.message).toContain("Boutique")
    })

    it("should return 404 if product not found", async () => {
      // Shop exists
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ name: "Test Shop" }) })
      // Product doesn't exist
      mockGet.mockResolvedValueOnce({ exists: false })

      const { POST } = await import("@/app/api/orders/route")

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          shopId: "shop-123",
          items: [{ productId: "nonexistent-product", quantity: 2 }],
          deliveryAddress: "123 Main St",
          deliveryLocation: { latitude: 48.8566, longitude: 2.3522 },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.message).toContain("Produit")
    })

    it("should create order successfully", async () => {
      // Shop exists
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ name: "Test Shop" }) })
      // Product exists
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ price: 10 }) })
      // Set order
      mockSet.mockResolvedValueOnce(undefined)
      // Add activity log
      mockAdd.mockResolvedValueOnce({ id: "activity-id" })

      const { POST } = await import("@/app/api/orders/route")

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          shopId: "shop-123",
          items: [{ productId: "prod-1", quantity: 2 }],
          deliveryAddress: "123 Main St",
          deliveryLocation: { latitude: 48.8566, longitude: 2.3522 },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.order).toBeDefined()
      expect(data.order.status).toBe("pending")
      expect(data.order.total).toBe(25) // 10 * 2 + 5 (delivery fee)
    })

    it("should calculate total correctly with multiple items", async () => {
      // Shop exists
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ name: "Test Shop" }) })
      // Product 1
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ price: 10 }) })
      // Product 2
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ price: 15 }) })
      mockSet.mockResolvedValueOnce(undefined)
      mockAdd.mockResolvedValueOnce({ id: "activity-id" })

      const { POST } = await import("@/app/api/orders/route")

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          shopId: "shop-123",
          items: [
            { productId: "prod-1", quantity: 2 }, // 10 * 2 = 20
            { productId: "prod-2", quantity: 3 }, // 15 * 3 = 45
          ],
          deliveryAddress: "123 Main St",
          deliveryLocation: { latitude: 48.8566, longitude: 2.3522 },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.order.total).toBe(70) // 20 + 45 + 5 (delivery fee)
    })
  })
})
