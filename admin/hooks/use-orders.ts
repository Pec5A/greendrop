"use client"

import { useEffect, useState } from "react"
import type { Order } from "@/lib/types"
import {
  subscribeToOrders,
  createOrder as createOrderService,
  updateOrder as updateOrderService,
  updateOrderStatus as updateOrderStatusService,
  deleteOrder as deleteOrderService,
  assignDriverToOrder as assignDriverToOrderService,
} from "@/lib/firebase/services/orders"
import {
  logOrderCreated,
  logOrderUpdated,
  logOrderDriverAssigned,
} from "@/lib/firebase/services/activity-logs"

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    created: 0,
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    pendingShipment: 0,
    deliveredToday: 0,
    delayedOrders: 0,
    onTimeRate: 100,
    totalRevenue: 0,
  })

  useEffect(() => {
    const unsubscribe = subscribeToOrders(
      (data) => {
        setOrders(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const newStats = {
      total: orders.length,
      created: orders.filter((o) => o.status === "created").length,
      paid: orders.filter((o) => o.status === "paid").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      pendingShipment: orders.filter((o) => o.status === "paid").length,
      deliveredToday: orders.filter((o) => {
        if (o.status !== "delivered") return false
        const deliveredAt = o.deliveredAt ?? o.updatedAt
        if (!deliveredAt) return false
        const deliveredDate = new Date(deliveredAt)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        return deliveredDate.getTime() >= startOfDay.getTime()
      }).length,
      delayedOrders: orders.filter((o) => {
        if (!o.expectedDelivery) return false
        if (o.status === "delivered" || o.status === "cancelled") return false
        return new Date(o.expectedDelivery).getTime() < Date.now()
      }).length,
      onTimeRate: (() => {
        const deliveredOrders = orders.filter((o) => o.status === "delivered")
        if (deliveredOrders.length === 0) return 100
        const onTime = deliveredOrders.filter((o) => {
          if (!o.expectedDelivery || !o.deliveredAt) return true
          return new Date(o.deliveredAt).getTime() <= new Date(o.expectedDelivery).getTime()
        }).length
        return Math.round((onTime / deliveredOrders.length) * 100)
      })(),
      totalRevenue: orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.total, 0),
    }
    setStats(newStats)
  }, [orders])

  const createOrder = async (orderData: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
    const id = await createOrderService(orderData)
    await logOrderCreated(id, orderData.userId)
    return id
  }

  const updateOrder = async (id: string, orderData: Partial<Order>) => {
    await updateOrderService(id, orderData)
  }

  const updateOrderStatus = async (id: string, status: Order["status"]) => {
    await updateOrderStatusService(id, status)
    await logOrderUpdated(id, status)
  }

  const assignDriver = async (orderId: string, driver: { id: string; name: string; phone?: string }) => {
    await assignDriverToOrderService(orderId, driver)
    await logOrderDriverAssigned(orderId, driver.name, driver.id)
  }

  const deleteOrder = async (id: string) => {
    await deleteOrderService(id)
  }

  return {
    orders,
    loading,
    error,
    stats,
    createOrder,
    updateOrder,
    updateOrderStatus,
    assignDriver,
    deleteOrder,
  }
}
