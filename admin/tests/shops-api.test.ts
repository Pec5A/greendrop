import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Firebase
const mockGet = vi.fn()
const mockWhere = vi.fn()

const mockChain = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnThis(),
  where: mockWhere,
  get: mockGet,
}

mockWhere.mockReturnValue(mockChain)

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

describe("Shops API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/shops", () => {
    it("should return all shops", async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: "shop-1",
            data: () => ({
              name: "Bio Market",
              category: "groceries",
              location: { latitude: 48.8566, longitude: 2.3522 },
            }),
          },
          {
            id: "shop-2",
            data: () => ({
              name: "Green Store",
              category: "organic",
              location: { latitude: 48.86, longitude: 2.35 },
            }),
          },
        ],
      })

      const { GET } = await import("@/app/api/shops/route")

      const request = new NextRequest("http://localhost:3000/api/shops")
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.shops).toHaveLength(2)
    })

    it("should filter shops by category", async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: "shop-1",
            data: () => ({
              name: "Bio Market",
              category: "groceries",
            }),
          },
        ],
      })

      const { GET } = await import("@/app/api/shops/route")

      const request = new NextRequest("http://localhost:3000/api/shops?category=groceries")
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockWhere).toHaveBeenCalledWith("category", "==", "groceries")
    })

    it("should filter shops by search text", async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: "shop-1",
            data: () => ({
              name: "Bio Market Paris",
              description: "Organic food store",
              category: "groceries",
            }),
          },
          {
            id: "shop-2",
            data: () => ({
              name: "Green Store",
              description: "Eco products",
              category: "organic",
            }),
          },
        ],
      })

      const { GET } = await import("@/app/api/shops/route")

      const request = new NextRequest("http://localhost:3000/api/shops?search=bio")
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.shops).toHaveLength(1)
      expect(data.shops[0].name).toBe("Bio Market Paris")
    })

    it("should filter shops by distance with Haversine formula", async () => {
      // Paris coordinates
      const parisLat = 48.8566
      const parisLng = 2.3522

      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: "shop-near",
            data: () => ({
              name: "Near Shop",
              location: { latitude: parisLat + 0.01, longitude: parisLng + 0.01 }, // ~1.5km away
            }),
          },
          {
            id: "shop-far",
            data: () => ({
              name: "Far Shop",
              location: { latitude: parisLat + 0.5, longitude: parisLng + 0.5 }, // ~70km away
            }),
          },
        ],
      })

      const { GET } = await import("@/app/api/shops/route")

      // Request with 5km radius
      const request = new NextRequest(`http://localhost:3000/api/shops?lat=${parisLat}&lng=${parisLng}&radius=5`)
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      // Only the near shop should be returned (within 5km)
      expect(data.shops).toHaveLength(1)
      expect(data.shops[0].name).toBe("Near Shop")
      expect(data.shops[0].distance).toBeLessThan(5)
    })

    it("should sort shops by distance when coordinates provided", async () => {
      const userLat = 48.8566
      const userLng = 2.3522

      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: "shop-far",
            data: () => ({
              name: "Far Shop",
              location: { latitude: userLat + 0.05, longitude: userLng + 0.05 },
            }),
          },
          {
            id: "shop-near",
            data: () => ({
              name: "Near Shop",
              location: { latitude: userLat + 0.01, longitude: userLng + 0.01 },
            }),
          },
        ],
      })

      const { GET } = await import("@/app/api/shops/route")

      const request = new NextRequest(`http://localhost:3000/api/shops?lat=${userLat}&lng=${userLng}&radius=50`)
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      // Shops should be sorted by distance (nearest first)
      expect(data.shops[0].name).toBe("Near Shop")
      expect(data.shops[1].name).toBe("Far Shop")
    })

    it("should use default 10km radius", async () => {
      const userLat = 48.8566
      const userLng = 2.3522

      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: "shop-1",
            data: () => ({
              name: "Shop",
              location: { latitude: userLat + 0.05, longitude: userLng }, // ~5.5km
            }),
          },
          {
            id: "shop-2",
            data: () => ({
              name: "Shop Far",
              location: { latitude: userLat + 0.15, longitude: userLng }, // ~16.5km
            }),
          },
        ],
      })

      const { GET } = await import("@/app/api/shops/route")

      // No radius param - should default to 10km
      const request = new NextRequest(`http://localhost:3000/api/shops?lat=${userLat}&lng=${userLng}`)
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      // Only shop within 10km should be returned
      expect(data.shops).toHaveLength(1)
      expect(data.shops[0].name).toBe("Shop")
    })
  })
})
