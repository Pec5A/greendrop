import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────

const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockAdd = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn()

const mockChain = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnValue({ id: "mock-id", get: mockGet, update: mockUpdate }),
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
  add: mockAdd,
  batch: vi.fn().mockReturnValue({
    delete: mockBatchDelete,
    commit: mockBatchCommit.mockResolvedValue(undefined),
  }),
}

mockWhere.mockReturnValue(mockChain)
mockLimit.mockReturnValue(mockChain)

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: vi.fn().mockResolvedValue({ uid: "admin-uid" }) },
  adminDb: mockChain,
}))

// Mock withAuth to pass admin role for POST, user role for PUT
let currentRole = "admin"
vi.mock("@/lib/api-middleware", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown, _opts?: unknown) => async (request: NextRequest) => {
    return handler(request, { userId: "admin-uid", userRole: currentRole })
  },
  handleApiError: (error: Error) => {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  },
}))

// Mock FCM
const mockSendEachForMulticast = vi.fn()
vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({
    sendEachForMulticast: mockSendEachForMulticast,
  }),
}))

describe("Notifications API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockUpdate.mockReset()
    mockAdd.mockReset()
    currentRole = "admin"
  })

  // ── POST /api/notifications (send push) ──────────

  describe("POST /api/notifications", () => {
    it("should return 400 if required fields are missing", async () => {
      const { POST } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }), // missing title and message
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.message).toContain("requis")
    })

    it("should return 404 if no FCM tokens found", async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] })

      const { POST } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          title: "Test",
          message: "Hello",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(404)
    })

    it("should send notification via FCM and return success count", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          { data: () => ({ token: "token-1" }) },
          { data: () => ({ token: "token-2" }) },
        ],
      })

      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      })

      mockAdd.mockResolvedValueOnce({ id: "notif-id" })

      const { POST } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          title: "New Order",
          message: "Your order is ready",
          data: { orderId: "order-1" },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.successCount).toBe(2)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ["token-1", "token-2"],
          notification: { title: "New Order", body: "Your order is ready" },
        })
      )
    })

    it("should clean up invalid FCM tokens", async () => {
      const invalidDoc = { ref: { id: "doc-invalid" }, data: () => ({ token: "bad-token" }) }
      const validDoc = { ref: { id: "doc-valid" }, data: () => ({ token: "good-token" }) }

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [invalidDoc, validDoc],
      })

      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: false, error: { code: "messaging/invalid-registration-token" } },
          { success: true },
        ],
      })

      mockAdd.mockResolvedValueOnce({ id: "notif-id" })

      const { POST } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          title: "Test",
          message: "Hello",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.failureCount).toBe(1)
      expect(mockBatchDelete).toHaveBeenCalled()
      expect(mockBatchCommit).toHaveBeenCalled()
    })

    it("should persist notification record in Firestore", async () => {
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ token: "token-1" }) }],
      })

      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      mockAdd.mockResolvedValueOnce({ id: "notif-id" })

      const { POST } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          title: "Test",
          message: "Hello",
        }),
      })

      await POST(request)
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          title: "Test",
          message: "Hello",
          sentBy: "admin-uid",
          successCount: 1,
        })
      )
    })
  })

  // ── PUT /api/notifications (register token) ──────

  describe("PUT /api/notifications", () => {
    it("should return 400 if token is missing", async () => {
      currentRole = "user"
      const { PUT } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "PUT",
        body: JSON.stringify({}),
      })

      const response = await PUT(request)
      expect(response.status).toBe(400)
    })

    it("should register a new FCM token", async () => {
      currentRole = "user"
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] }) // no existing token
      mockAdd.mockResolvedValueOnce({ id: "token-doc-id" })

      const { PUT } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "PUT",
        body: JSON.stringify({ token: "new-fcm-token", deviceId: "iphone-14" }),
      })

      const response = await PUT(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-uid",
          token: "new-fcm-token",
          deviceId: "iphone-14",
        })
      )
    })

    it("should update existing token's lastUsed date", async () => {
      currentRole = "user"
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "existing-token-doc", data: () => ({ token: "existing-token" }) }],
      })
      mockUpdate.mockResolvedValueOnce(undefined)

      const { PUT } = await import("@/app/api/notifications/route")

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "PUT",
        body: JSON.stringify({ token: "existing-token" }),
      })

      const response = await PUT(request)
      expect(response.status).toBe(200)
    })
  })
})
