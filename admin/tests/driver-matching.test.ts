import { describe, it, expect, vi, beforeEach } from "vitest"

// We test the pure functions by extracting them via module internals
// Since haversineDistance and scoreCandidate are not exported, we test them
// through findBestDrivers which uses both internally.

const mockGetDocs = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockCollection = vi.fn()
const mockAssignDriverToOrder = vi.fn()
const mockUpdateOrderDriver = vi.fn()

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}))

vi.mock("@/lib/firebase/config", () => ({
  db: {},
}))

vi.mock("@/lib/firebase/collections", () => ({
  COLLECTIONS: { DRIVERS: "drivers" },
}))

vi.mock("@/lib/firebase/services/drivers", () => ({
  assignDriverToOrder: (...args: unknown[]) => mockAssignDriverToOrder(...args),
}))

vi.mock("@/lib/firebase/services/orders", () => ({
  assignDriverToOrder: (...args: unknown[]) => mockUpdateOrderDriver(...args),
}))

function makeDriverDoc(overrides: Record<string, unknown> = {}) {
  const defaults = {
    id: "driver-1",
    name: "Test Driver",
    email: "driver@test.com",
    phone: "+33600000000",
    status: "online",
    vehicleType: "bike",
    rating: 4.5,
    completedDeliveries: 50,
    currentOrderId: null,
    lastSeenAt: new Date().toISOString(),
    location: {
      lat: 48.8566,   // Paris
      lng: 2.3522,
      heading: 0,
      speed: 0,
      updatedAt: new Date().toISOString(),
    },
  }
  const data = { ...defaults, ...overrides }
  return {
    id: data.id,
    data: () => data,
  }
}

describe("Driver Matching", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("findBestDrivers", () => {
    it("should return empty array when no drivers are online", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522)
      expect(result).toEqual([])
    })

    it("should reject drivers beyond 10km radius", async () => {
      // Driver in Marseille (~775km from Paris)
      mockGetDocs.mockResolvedValueOnce({
        docs: [makeDriverDoc({
          id: "far-driver",
          location: { lat: 43.2965, lng: 5.3698, heading: 0, speed: 0, updatedAt: new Date().toISOString() },
        })],
      })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522) // Paris
      expect(result).toEqual([])
    })

    it("should include drivers within 10km radius", async () => {
      // Driver ~1.5km from pickup (same Paris area)
      mockGetDocs.mockResolvedValueOnce({
        docs: [makeDriverDoc({
          id: "near-driver",
          location: { lat: 48.8606, lng: 2.3376, heading: 0, speed: 0, updatedAt: new Date().toISOString() },
        })],
      })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522)
      expect(result.length).toBe(1)
      expect(result[0].driver.id).toBe("near-driver")
      expect(result[0].distance).toBeLessThan(10)
      expect(result[0].score).toBeGreaterThan(0)
    })

    it("should skip drivers with a current order", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [makeDriverDoc({
          id: "busy-driver",
          currentOrderId: "order-123",
          location: { lat: 48.8606, lng: 2.3376, heading: 0, speed: 0, updatedAt: new Date().toISOString() },
        })],
      })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522)
      expect(result).toEqual([])
    })

    it("should skip drivers without location", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [makeDriverDoc({ id: "no-loc", location: null })],
      })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522)
      expect(result).toEqual([])
    })

    it("should rank closer drivers higher", async () => {
      const now = new Date().toISOString()
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          makeDriverDoc({
            id: "far-ish",
            rating: 4.5,
            completedDeliveries: 50,
            lastSeenAt: now,
            location: { lat: 48.89, lng: 2.35, heading: 0, speed: 0, updatedAt: now }, // ~3.7km
          }),
          makeDriverDoc({
            id: "very-close",
            rating: 4.5,
            completedDeliveries: 50,
            lastSeenAt: now,
            location: { lat: 48.857, lng: 2.353, heading: 0, speed: 0, updatedAt: now }, // ~0.1km
          }),
        ],
      })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522)
      expect(result.length).toBe(2)
      expect(result[0].driver.id).toBe("very-close")
      expect(result[1].driver.id).toBe("far-ish")
      expect(result[0].score).toBeGreaterThan(result[1].score)
    })

    it("should factor in rating score", async () => {
      const now = new Date().toISOString()
      const baseLoc = { lat: 48.857, lng: 2.353, heading: 0, speed: 0, updatedAt: now }
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          makeDriverDoc({ id: "low-rated", rating: 1, completedDeliveries: 50, lastSeenAt: now, location: baseLoc }),
          makeDriverDoc({ id: "high-rated", rating: 5, completedDeliveries: 50, lastSeenAt: now, location: baseLoc }),
        ],
      })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522)
      expect(result[0].driver.id).toBe("high-rated")
    })

    it("should limit results to maxResults", async () => {
      const now = new Date().toISOString()
      const drivers = Array.from({ length: 10 }, (_, i) =>
        makeDriverDoc({
          id: `driver-${i}`,
          lastSeenAt: now,
          location: { lat: 48.857 + i * 0.001, lng: 2.353, heading: 0, speed: 0, updatedAt: now },
        })
      )
      mockGetDocs.mockResolvedValueOnce({ docs: drivers })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522, 3)
      expect(result.length).toBe(3)
    })

    it("should handle driver with no rating gracefully (defaults to 3)", async () => {
      const now = new Date().toISOString()
      mockGetDocs.mockResolvedValueOnce({
        docs: [makeDriverDoc({
          id: "no-rating",
          rating: undefined,
          lastSeenAt: now,
          location: { lat: 48.857, lng: 2.353, heading: 0, speed: 0, updatedAt: now },
        })],
      })
      const { findBestDrivers } = await import("@/lib/firebase/services/driver-matching")

      const result = await findBestDrivers(48.8566, 2.3522)
      expect(result.length).toBe(1)
      expect(result[0].score).toBeGreaterThan(0)
    })
  })

  describe("autoAssignDriver", () => {
    it("should return null when no candidates found", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] })
      const { autoAssignDriver } = await import("@/lib/firebase/services/driver-matching")

      const result = await autoAssignDriver("order-1", 48.8566, 2.3522)
      expect(result).toBeNull()
    })

    it("should assign the best driver and update both collections", async () => {
      const now = new Date().toISOString()
      mockGetDocs.mockResolvedValueOnce({
        docs: [makeDriverDoc({
          id: "best-driver",
          name: "Best Driver",
          phone: "+33600000001",
          lastSeenAt: now,
          location: { lat: 48.857, lng: 2.353, heading: 0, speed: 0, updatedAt: now },
        })],
      })
      mockAssignDriverToOrder.mockResolvedValueOnce(undefined)
      mockUpdateOrderDriver.mockResolvedValueOnce(undefined)

      const { autoAssignDriver } = await import("@/lib/firebase/services/driver-matching")

      const result = await autoAssignDriver("order-1", 48.8566, 2.3522)
      expect(result).not.toBeNull()
      expect(result!.id).toBe("best-driver")
      expect(mockAssignDriverToOrder).toHaveBeenCalledWith("best-driver", "order-1", { driverName: "Best Driver" })
      expect(mockUpdateOrderDriver).toHaveBeenCalledWith("order-1", {
        id: "best-driver",
        name: "Best Driver",
        phone: "+33600000001",
      })
    })
  })
})
