import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────

const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockAdd = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()

const mockChain = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnValue({ id: "driver-doc-id", get: mockGet, update: mockUpdate }),
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
  add: mockAdd,
}

mockWhere.mockReturnValue(mockChain)
mockLimit.mockReturnValue(mockChain)

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: vi.fn().mockResolvedValue({ uid: "driver-uid" }) },
  adminDb: mockChain,
}))

vi.mock("@/lib/api-middleware", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown, _opts?: unknown) => async (request: NextRequest) => {
    return handler(request, { userId: "driver-uid", userRole: "driver" })
  },
  handleApiError: (error: Error) => {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  },
}))

describe("Drivers API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockUpdate.mockReset()
    mockAdd.mockReset()
  })

  // ── Status ───────────────────────────────────────

  describe("POST /api/drivers/status", () => {
    it("should return 400 for invalid status", async () => {
      const { POST } = await import("@/app/api/drivers/status/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/status", {
        method: "POST",
        body: JSON.stringify({ status: "invalid" }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toContain("Statut invalide")
    })

    it("should return 400 if status is missing", async () => {
      const { POST } = await import("@/app/api/drivers/status/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/status", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it("should accept valid statuses: online, offline, busy, break", async () => {
      for (const status of ["online", "offline", "busy", "break"]) {
        vi.clearAllMocks()
        mockGet.mockResolvedValueOnce({
          empty: false,
          docs: [{ id: "driver-1", data: () => ({ status: "offline" }) }],
        })
        mockUpdate.mockResolvedValueOnce(undefined)
        mockAdd.mockResolvedValueOnce({ id: "log-id" })

        const { POST } = await import("@/app/api/drivers/status/route")

        const request = new NextRequest("http://localhost:3000/api/drivers/status", {
          method: "POST",
          body: JSON.stringify({ status }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.status).toBe(status)
      }
    })

    it("should return 404 if driver profile not found", async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const { POST } = await import("@/app/api/drivers/status/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/status", {
        method: "POST",
        body: JSON.stringify({ status: "online" }),
      })

      const response = await POST(request)
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.message).toContain("introuvable")
    })

    it("should update status and create activity log", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "driver-1", data: () => ({ status: "offline" }) }],
      })
      mockUpdate.mockResolvedValueOnce(undefined)
      mockAdd.mockResolvedValueOnce({ id: "log-id" })

      const { POST } = await import("@/app/api/drivers/status/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/status", {
        method: "POST",
        body: JSON.stringify({ status: "online" }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "driver_status_changed",
          driverId: "driver-1",
        })
      )
    })
  })

  // ── Location ─────────────────────────────────────

  describe("POST /api/drivers/location", () => {
    it("should return 400 if latitude or longitude is missing", async () => {
      const { POST } = await import("@/app/api/drivers/location/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/location", {
        method: "POST",
        body: JSON.stringify({ latitude: 48.8566 }), // missing longitude
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toContain("latitude")
    })

    it("should return 404 if driver profile not found", async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const { POST } = await import("@/app/api/drivers/location/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/location", {
        method: "POST",
        body: JSON.stringify({ latitude: 48.8566, longitude: 2.3522 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(404)
    })

    it("should update location successfully with heading and speed", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "driver-1" }],
      })
      mockUpdate.mockResolvedValueOnce(undefined)

      const { POST } = await import("@/app/api/drivers/location/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/location", {
        method: "POST",
        body: JSON.stringify({
          latitude: 48.8566,
          longitude: 2.3522,
          heading: 180,
          speed: 25,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            lat: 48.8566,
            lng: 2.3522,
            heading: 180,
            speed: 25,
          }),
        })
      )
    })

    it("should default heading and speed to 0 if not provided", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "driver-1" }],
      })
      mockUpdate.mockResolvedValueOnce(undefined)

      const { POST } = await import("@/app/api/drivers/location/route")

      const request = new NextRequest("http://localhost:3000/api/drivers/location", {
        method: "POST",
        body: JSON.stringify({ latitude: 48.8566, longitude: 2.3522 }),
      })

      await POST(request)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            heading: 0,
            speed: 0,
          }),
        })
      )
    })
  })
})
