"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, DollarSign, ShoppingBag } from "lucide-react"
import { getOrderStats } from "@/lib/firebase/services/orders"
import { getUsers } from "@/lib/firebase/services/users"

interface AnalyticsStat {
  label: string
  value: string
  icon: React.ReactNode
}

export function AnalyticsWidget() {
  const [stats, setStats] = useState<AnalyticsStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [orderStats, users] = await Promise.all([getOrderStats(), getUsers()])

        const revenueFormatted = orderStats.totalRevenue.toLocaleString("en-US", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 2,
        })

        setStats([
          {
            label: "Total Users",
            value: users.length.toLocaleString(),
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: "Total Orders",
            value: orderStats.total.toLocaleString(),
            icon: <Package className="h-4 w-4" />,
          },
          {
            label: "Total Revenue",
            value: revenueFormatted,
            icon: <DollarSign className="h-4 w-4" />,
          },
          {
            label: "Delivered Today",
            value: orderStats.deliveredToday.toLocaleString(),
            icon: <ShoppingBag className="h-4 w-4" />,
          },
        ])
      } catch (error) {
        console.error("Failed to load analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
