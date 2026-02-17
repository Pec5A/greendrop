import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Tests for Cloud Function order triggers logic.
 * Since triggers run in Firebase Functions env, we test the business logic patterns:
 * - Activity log creation on order events
 * - Notification dispatch on status changes
 * - Driver release on order completion
 * - Timeline initialization
 */

const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockDoc = vi.fn().mockReturnValue({ id: "mock-doc-id" })
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc })

const mockBatch = {
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}

// Simulate the trigger logic extracted from order-created.ts
function simulateOnOrderCreated(
  orderId: string,
  orderData: Record<string, unknown>,
  db: { collection: typeof mockCollection; batch: () => typeof mockBatch }
) {
  const batch = db.batch()

  // 1. Log activity
  const activityLogRef = db.collection("activityLogs").doc()
  batch.set(activityLogRef, {
    entityType: "order",
    entityId: orderId,
    type: "order_created",
    message: `New order created by user ${orderData.userName || orderData.userId}`,
    userId: orderData.userId,
    metadata: {
      total: orderData.total,
      itemCount: (orderData.items as unknown[])?.length || 0,
      status: orderData.status,
    },
  })

  // 2. Initialize timeline if not present
  if (!orderData.timeline || (orderData.timeline as unknown[]).length === 0) {
    const orderRef = db.collection("orders").doc()
    batch.update(orderRef, {
      timeline: [
        {
          type: "status",
          title: "Order created",
          description: "Order has been successfully placed",
          actor: "system",
        },
      ],
    })
  }

  // 3. Admin notification
  const adminNotifRef = db.collection("notifications").doc()
  batch.set(adminNotifRef, {
    target: "admin",
    type: "info",
    category: "order",
    title: "Nouvelle commande",
    read: false,
  })

  return batch.commit()
}

// Simulate the trigger logic extracted from order-status-change.ts
function simulateOnOrderStatusChange(
  orderId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  db: { collection: typeof mockCollection; batch: () => typeof mockBatch }
) {
  if (before.status === after.status) return null

  const batch = db.batch()

  // 1. Activity log
  const activityLogRef = db.collection("activityLogs").doc()
  batch.set(activityLogRef, {
    entityType: "order",
    entityId: orderId,
    type: "order_updated",
    message: `Order status changed from "${before.status}" to "${after.status}"`,
    metadata: { oldStatus: before.status, newStatus: after.status },
  })

  // 2. User notification
  const userNotifRef = db.collection("notifications").doc()
  batch.set(userNotifRef, {
    userId: after.userId,
    title: `Order ${after.status}`,
    type: "order_update",
    orderId,
  })

  // 3. Admin notification on cancellation
  if (after.status === "cancelled") {
    const adminNotifRef = db.collection("notifications").doc()
    batch.set(adminNotifRef, {
      target: "admin",
      type: "warning",
      category: "order",
      title: "Commande annulée",
    })
  }

  // 4. Admin notification on delivery
  if (after.status === "delivered") {
    const adminNotifRef = db.collection("notifications").doc()
    batch.set(adminNotifRef, {
      target: "admin",
      type: "success",
      category: "order",
      title: "Commande livrée",
    })
  }

  // 5. Release driver on completion
  if ((after.status === "delivered" || after.status === "cancelled") && after.driverId) {
    const driverRef = db.collection("drivers").doc()
    batch.update(driverRef, {
      isAvailable: true,
      currentOrderId: null,
      status: "online",
    })

    // Driver notification
    const driverNotifRef = db.collection("notifications").doc()
    batch.set(driverNotifRef, {
      userId: after.driverId,
      title: "Delivery Completed",
      type: "delivery_update",
    })
  }

  // 6. Driver assignment notification
  if (after.status === "shipped" && after.driverId && !before.driverId) {
    const driverNotifRef = db.collection("notifications").doc()
    batch.set(driverNotifRef, {
      userId: after.driverId,
      title: "New Delivery Assignment",
      type: "delivery_assignment",
    })
  }

  return batch.commit()
}

describe("Order Triggers", () => {
  const db = {
    collection: mockCollection,
    batch: () => mockBatch,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("onOrderCreated", () => {
    it("should create an activity log for new orders", async () => {
      await simulateOnOrderCreated("order-1", {
        userId: "user-1",
        userName: "John",
        total: 25,
        items: [{ productId: "p1" }, { productId: "p2" }],
        status: "pending",
      }, db)

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entityType: "order",
          entityId: "order-1",
          type: "order_created",
          metadata: expect.objectContaining({ total: 25, itemCount: 2 }),
        })
      )
    })

    it("should initialize timeline when not present", async () => {
      await simulateOnOrderCreated("order-2", {
        userId: "user-1",
        total: 10,
        items: [],
        status: "pending",
        timeline: [],
      }, db)

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          timeline: expect.arrayContaining([
            expect.objectContaining({ type: "status", title: "Order created" }),
          ]),
        })
      )
    })

    it("should not reinitialize timeline if already present", async () => {
      await simulateOnOrderCreated("order-3", {
        userId: "user-1",
        total: 10,
        items: [],
        status: "pending",
        timeline: [{ type: "status", title: "Existing" }],
      }, db)

      // Only activity log + admin notification sets, no update for timeline
      expect(mockBatchUpdate).not.toHaveBeenCalled()
    })

    it("should send admin notification", async () => {
      await simulateOnOrderCreated("order-4", {
        userId: "user-1",
        total: 50,
        items: [],
        status: "pending",
      }, db)

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          target: "admin",
          type: "info",
          category: "order",
          title: "Nouvelle commande",
        })
      )
    })

    it("should commit the batch", async () => {
      await simulateOnOrderCreated("order-5", {
        userId: "user-1",
        total: 10,
        items: [],
        status: "pending",
      }, db)

      expect(mockBatchCommit).toHaveBeenCalled()
    })
  })

  describe("onOrderStatusChange", () => {
    it("should do nothing if status hasn't changed", () => {
      const result = simulateOnOrderStatusChange(
        "order-1",
        { status: "pending", userId: "user-1" },
        { status: "pending", userId: "user-1" },
        db
      )
      expect(result).toBeNull()
      expect(mockBatchSet).not.toHaveBeenCalled()
    })

    it("should create activity log on status change", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "pending", userId: "user-1" },
        { status: "confirmed", userId: "user-1" },
        db
      )

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "order_updated",
          metadata: { oldStatus: "pending", newStatus: "confirmed" },
        })
      )
    })

    it("should notify user on status change", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "pending", userId: "user-1" },
        { status: "shipped", userId: "user-1" },
        db
      )

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "user-1",
          title: "Order shipped",
          type: "order_update",
        })
      )
    })

    it("should send admin warning on cancellation", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "pending", userId: "user-1" },
        { status: "cancelled", userId: "user-1" },
        db
      )

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          target: "admin",
          type: "warning",
          title: "Commande annulée",
        })
      )
    })

    it("should send admin success on delivery", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "shipped", userId: "user-1" },
        { status: "delivered", userId: "user-1" },
        db
      )

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          target: "admin",
          type: "success",
          title: "Commande livrée",
        })
      )
    })

    it("should release driver when order is delivered", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "shipped", userId: "user-1", driverId: "driver-1" },
        { status: "delivered", userId: "user-1", driverId: "driver-1" },
        db
      )

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isAvailable: true,
          currentOrderId: null,
          status: "online",
        })
      )
    })

    it("should release driver when order is cancelled", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "pending", userId: "user-1", driverId: "driver-1" },
        { status: "cancelled", userId: "user-1", driverId: "driver-1" },
        db
      )

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isAvailable: true,
          currentOrderId: null,
          status: "online",
        })
      )
    })

    it("should NOT release driver on non-terminal status", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "pending", userId: "user-1", driverId: "driver-1" },
        { status: "shipped", userId: "user-1", driverId: "driver-1" },
        db
      )

      expect(mockBatchUpdate).not.toHaveBeenCalled()
    })

    it("should notify driver on new assignment (shipped + new driver)", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "confirmed", userId: "user-1", driverId: null },
        { status: "shipped", userId: "user-1", driverId: "driver-1" },
        db
      )

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "driver-1",
          title: "New Delivery Assignment",
          type: "delivery_assignment",
        })
      )
    })

    it("should NOT send assignment notification if driver was already assigned", async () => {
      await simulateOnOrderStatusChange(
        "order-1",
        { status: "confirmed", userId: "user-1", driverId: "driver-1" },
        { status: "shipped", userId: "user-1", driverId: "driver-1" },
        db
      )

      const assignmentCalls = mockBatchSet.mock.calls.filter(
        (call) => call[1]?.type === "delivery_assignment"
      )
      expect(assignmentCalls.length).toBe(0)
    })
  })
})
