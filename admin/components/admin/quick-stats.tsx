"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getOrderStats } from "@/lib/firebase/services/orders"
import { getVerificationStats } from "@/lib/firebase/services/verifications"
import { getOrders } from "@/lib/firebase/services/orders"

interface QuickStat {
  label: string
  value: string
  subValue: string
}

export function QuickStats() {
  const [stats, setStats] = useState<QuickStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [orderStats, verificationStats, orders] = await Promise.all([
          getOrderStats(),
          getVerificationStats(),
          getOrders(),
        ])

        const nonCancelledOrders = orders.filter((o) => o.status !== "cancelled")
        const avgOrderValue =
          nonCancelledOrders.length > 0
            ? orderStats.totalRevenue / nonCancelledOrders.length
            : 0

        const verificationRate =
          verificationStats.total > 0
            ? Math.round((verificationStats.approved / verificationStats.total) * 1000) / 10
            : 0

        setStats([
          {
            label: "Avg Order Value",
            value: avgOrderValue.toLocaleString("en-US", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
            }),
            subValue: `Based on ${nonCancelledOrders.length} orders`,
          },
          {
            label: "Verification Rate",
            value: `${verificationRate}%`,
            subValue: `${verificationStats.approved} of ${verificationStats.total} verified`,
          },
          {
            label: "On-Time Delivery",
            value: `${orderStats.onTimeRate}%`,
            subValue: `${orderStats.delivered} deliveries completed`,
          },
          {
            label: "Pending Orders",
            value: orderStats.pendingShipment.toString(),
            subValue: `${orderStats.delayedOrders} delayed`,
          },
        ])
      } catch (error) {
        console.error("Failed to load quick stats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Loading...</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.subValue}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
