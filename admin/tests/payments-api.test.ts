import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────

const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockAdd = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn()

const mockRef = { update: mockUpdate }
const mockChain = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnValue({ id: "mock-id", get: mockGet, ref: mockRef, update: mockUpdate }),
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
  add: mockAdd,
  batch: vi.fn().mockReturnValue({
    set: mockBatchSet,
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit.mockResolvedValue(undefined),
  }),
}

mockWhere.mockReturnValue(mockChain)
mockLimit.mockReturnValue(mockChain)

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: vi.fn().mockResolvedValue({ uid: "user-123" }) },
  adminDb: mockChain,
}))

vi.mock("@/lib/api-middleware", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown, _opts?: unknown) => async (request: NextRequest) => {
    return handler(request, { userId: "user-123", userRole: "user" })
  },
  handleApiError: (error: Error) => {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  },
}))

// Mock Stripe
const mockConstructEvent = vi.fn()
const mockCustomersCreate = vi.fn()
const mockEphemeralKeysCreate = vi.fn()
const mockPaymentIntentsCreate = vi.fn()
const mockPaymentMethodsList = vi.fn()
const mockTransfersCreate = vi.fn()
const mockAccountsCreate = vi.fn()
const mockAccountsDel = vi.fn()
const mockAccountLinksCreate = vi.fn()
const mockAccountsCreateExternalAccount = vi.fn()

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    customers: { create: (...args: unknown[]) => mockCustomersCreate(...args) },
    ephemeralKeys: { create: (...args: unknown[]) => mockEphemeralKeysCreate(...args) },
    paymentIntents: { create: (...args: unknown[]) => mockPaymentIntentsCreate(...args) },
    paymentMethods: { list: (...args: unknown[]) => mockPaymentMethodsList(...args) },
    transfers: { create: (...args: unknown[]) => mockTransfersCreate(...args) },
    accounts: {
      create: (...args: unknown[]) => mockAccountsCreate(...args),
      del: (...args: unknown[]) => mockAccountsDel(...args),
      createExternalAccount: (...args: unknown[]) => mockAccountsCreateExternalAccount(...args),
    },
    accountLinks: { create: (...args: unknown[]) => mockAccountLinksCreate(...args) },
  },
}))

describe("Payments API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockUpdate.mockReset()
    mockAdd.mockReset()
  })

  // ── Webhook ──────────────────────────────────────

  describe("POST /api/payments/webhook", () => {
    it("should return 400 if signature is missing", async () => {
      const { POST } = await import("@/app/api/payments/webhook/route")

      const request = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: "{}",
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain("Missing signature")
    })

    it("should return 400 if signature verification fails", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature")
      })

      const { POST } = await import("@/app/api/payments/webhook/route")

      const request = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "invalid_sig" },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain("Webhook Error")
    })

    it("should update order to paid on payment_intent.succeeded", async () => {
      mockConstructEvent.mockReturnValue({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_123",
            metadata: { shopId: "shop-1", userId: "user-1", driverId: "" },
            latest_charge: "ch_123",
          },
        },
      })

      const orderRef = { update: mockUpdate }
      const orderDoc = { id: "order-1", ref: orderRef, data: () => ({ deliveryFee: 5 }) }
      mockGet.mockResolvedValueOnce({ empty: false, docs: [orderDoc] })

      const { POST } = await import("@/app/api/payments/webhook/route")

      const request = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "valid_sig" },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "paid" }))
    })

    it("should update order to failed on payment_intent.payment_failed", async () => {
      mockConstructEvent.mockReturnValue({
        type: "payment_intent.payment_failed",
        data: { object: { id: "pi_fail" } },
      })

      const orderRef = { update: mockUpdate }
      const orderDoc = { id: "order-2", ref: orderRef }
      mockGet.mockResolvedValueOnce({ empty: false, docs: [orderDoc] })

      const { POST } = await import("@/app/api/payments/webhook/route")

      const request = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "valid_sig" },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "failed" }))
    })

    it("should transfer delivery fee to driver with Stripe account", async () => {
      mockConstructEvent.mockReturnValue({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_transfer",
            metadata: { shopId: "shop-1", userId: "user-1", driverId: "driver-1" },
            latest_charge: "ch_456",
          },
        },
      })

      const orderRef = { update: mockUpdate }
      const orderDoc = {
        id: "order-3",
        ref: orderRef,
        data: () => ({ deliveryFee: 5, driverId: "driver-1" }),
      }
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [orderDoc] }) // orders query
        .mockResolvedValueOnce({ data: () => ({ stripeAccountId: "acct_driver" }) }) // driver doc

      mockTransfersCreate.mockResolvedValueOnce({ id: "tr_123" })

      const { POST } = await import("@/app/api/payments/webhook/route")

      const request = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "valid_sig" },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockTransfersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500, // 5€ = 500 cents
          currency: "eur",
          destination: "acct_driver",
        })
      )
    })

    it("should handle unmatched event types gracefully", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.created",
        data: { object: {} },
      })

      const { POST } = await import("@/app/api/payments/webhook/route")

      const request = new NextRequest("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "valid_sig" },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
    })
  })

  // ── Create Intent ────────────────────────────────

  describe("POST /api/payments/create-intent", () => {
    it("should return 400 for invalid amount", async () => {
      const { POST } = await import("@/app/api/payments/create-intent/route")

      const request = new NextRequest("http://localhost:3000/api/payments/create-intent", {
        method: "POST",
        body: JSON.stringify({ amount: 0 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain("Invalid amount")
    })

    it("should create a new Stripe customer if none exists", async () => {
      mockGet.mockResolvedValueOnce({ data: () => ({ email: "user@test.com", name: "Test" }) }) // user doc
      mockCustomersCreate.mockResolvedValueOnce({ id: "cus_new" })
      mockUpdate.mockResolvedValueOnce(undefined) // save stripeCustomerId
      mockEphemeralKeysCreate.mockResolvedValueOnce({ secret: "ek_secret" })
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: "pi_new",
        client_secret: "cs_new",
        status: "requires_payment_method",
      })

      const { POST } = await import("@/app/api/payments/create-intent/route")

      const request = new NextRequest("http://localhost:3000/api/payments/create-intent", {
        method: "POST",
        body: JSON.stringify({ amount: 25.50 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.clientSecret).toBe("cs_new")
      expect(data.customerId).toBe("cus_new")
      expect(mockCustomersCreate).toHaveBeenCalled()
    })

    it("should reuse existing Stripe customer", async () => {
      mockGet.mockResolvedValueOnce({
        data: () => ({ email: "user@test.com", stripeCustomerId: "cus_existing" }),
      })
      mockEphemeralKeysCreate.mockResolvedValueOnce({ secret: "ek_secret" })
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: "pi_reuse",
        client_secret: "cs_reuse",
        status: "requires_payment_method",
      })

      const { POST } = await import("@/app/api/payments/create-intent/route")

      const request = new NextRequest("http://localhost:3000/api/payments/create-intent", {
        method: "POST",
        body: JSON.stringify({ amount: 10 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockCustomersCreate).not.toHaveBeenCalled()
    })

    it("should set up merchant transfer when shop has Stripe account", async () => {
      mockGet
        .mockResolvedValueOnce({ data: () => ({ stripeCustomerId: "cus_1" }) }) // user
        .mockResolvedValueOnce({ data: () => ({ stripeAccountId: "acct_shop" }) }) // shop
      mockEphemeralKeysCreate.mockResolvedValueOnce({ secret: "ek_s" })
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: "pi_transfer",
        client_secret: "cs_transfer",
        status: "requires_payment_method",
      })

      const { POST } = await import("@/app/api/payments/create-intent/route")

      const request = new NextRequest("http://localhost:3000/api/payments/create-intent", {
        method: "POST",
        body: JSON.stringify({ amount: 100, shopId: "shop-1" }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // 100€
          transfer_data: expect.objectContaining({
            amount: 8500, // 85%
            destination: "acct_shop",
          }),
        })
      )
    })

    it("should convert amount to cents correctly", async () => {
      mockGet.mockResolvedValueOnce({ data: () => ({ stripeCustomerId: "cus_1" }) })
      mockEphemeralKeysCreate.mockResolvedValueOnce({ secret: "ek_s" })
      mockPaymentIntentsCreate.mockResolvedValueOnce({
        id: "pi_cents",
        client_secret: "cs_cents",
        status: "requires_payment_method",
      })

      const { POST } = await import("@/app/api/payments/create-intent/route")

      const request = new NextRequest("http://localhost:3000/api/payments/create-intent", {
        method: "POST",
        body: JSON.stringify({ amount: 19.99 }),
      })

      await POST(request)
      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1999 })
      )
    })
  })

  // ── Connect Onboard ──────────────────────────────

  describe("POST /api/payments/connect/onboard", () => {
    it("should return 400 if shopId is missing", async () => {
      vi.doMock("@/lib/api-middleware", () => ({
        withAuth: (handler: (...args: unknown[]) => unknown) => async (request: NextRequest) => {
          return handler(request, { userId: "merchant-1", userRole: "merchant" })
        },
      }))
      const { POST } = await import("@/app/api/payments/connect/onboard/route")

      const request = new NextRequest("http://localhost:3000/api/payments/connect/onboard", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it("should return 403 if merchant doesn't own the shop", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: "other-user" }),
      })

      const { POST } = await import("@/app/api/payments/connect/onboard/route")

      const request = new NextRequest("http://localhost:3000/api/payments/connect/onboard", {
        method: "POST",
        body: JSON.stringify({ shopId: "shop-1" }),
      })

      const response = await POST(request)
      expect(response.status).toBe(403)
    })
  })
})
