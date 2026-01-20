"use client"

import { useEffect, useState } from "react"
import { subscribeToUsers } from "@/lib/firebase/services/users"
import { subscribeToOrders } from "@/lib/firebase/services/orders"
import { subscribeToVerifications } from "@/lib/firebase/services/verifications"
import { subscribeToDisputes } from "@/lib/firebase/services/disputes"
import { subscribeToDrivers } from "@/lib/firebase/services/drivers"

export interface DashboardStats {
  totalRevenue: number
  revenueChange: number
  activeUsers: number
  usersChange: number
  pendingVerifications: number
  verificationsChange: number
  openDisputes: number
  disputesChange: number
  pendingShipment: number
  deliveredToday: number
  delayedOrders: number
  onTimeRate: number
  activeDrivers: number
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueChange: 0,
    activeUsers: 0,
    usersChange: 0,
    pendingVerifications: 0,
    verificationsChange: 0,
    openDisputes: 0,
    disputesChange: 0,
    pendingShipment: 0,
    deliveredToday: 0,
    delayedOrders: 0,
    onTimeRate: 100,
    activeDrivers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Subscribe to all data for real-time updates
    const unsubscribeUsers = subscribeToUsers((users) => {
      setStats((prev) => ({
        ...prev,
        activeUsers: users.filter((u) => u.status === "verified").length,
      }))
    })

    const unsubscribeOrders = subscribeToOrders((orders) => {
      const totalRevenue = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.total, 0)

      const pendingShipment = orders.filter((o) => o.status === "paid").length
      const deliveredToday = orders.filter((o) => {
        if (o.status !== "delivered") return false
        const deliveredAt = o.deliveredAt ?? o.updatedAt
        if (!deliveredAt) return false
        const deliveredDate = new Date(deliveredAt)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        return deliveredDate.getTime() >= startOfDay.getTime()
      }).length
      const delayedOrders = orders.filter((o) => {
        if (!o.expectedDelivery) return false
        if (o.status === "delivered" || o.status === "cancelled") return false
        return new Date(o.expectedDelivery).getTime() < Date.now()
      }).length
      const deliveredOrders = orders.filter((o) => o.status === "delivered")
      const onTimeDeliveries = deliveredOrders.filter((o) => {
        if (!o.expectedDelivery || !o.deliveredAt) return true
        return new Date(o.deliveredAt).getTime() <= new Date(o.expectedDelivery).getTime()
      }).length
      const onTimeRate = deliveredOrders.length === 0 ? 100 : Math.round((onTimeDeliveries / deliveredOrders.length) * 100)

      setStats((prev) => ({
        ...prev,
        totalRevenue,
        pendingShipment,
        deliveredToday,
        delayedOrders,
        onTimeRate,
      }))
    })

    const unsubscribeVerifications = subscribeToVerifications((verifications) => {
      setStats((prev) => ({
        ...prev,
        pendingVerifications: verifications.filter((v) => v.status === "pending").length,
      }))
    })

    const unsubscribeDisputes = subscribeToDisputes((disputes) => {
      setStats((prev) => ({
        ...prev,
        openDisputes: disputes.filter(
          (d) => d.status === "open" || d.status === "investigating"
        ).length,
      }))
      setLoading(false)
    })

    const unsubscribeDrivers = subscribeToDrivers((drivers) => {
      setStats((prev) => ({
        ...prev,
        activeDrivers: drivers.filter((driver) => driver.status === "online" || driver.status === "busy").length,
      }))
    })

    return () => {
      unsubscribeUsers()
      unsubscribeOrders()
      unsubscribeVerifications()
      unsubscribeDisputes()
      unsubscribeDrivers()
    }
  }, [])

  return {
    stats,
    loading,
  }
}
