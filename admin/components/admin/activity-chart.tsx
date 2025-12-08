"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { getOrders } from "@/lib/firebase/services/orders"
import { getUsers } from "@/lib/firebase/services/users"

interface DayData {
  name: string
  orders: number
  users: number
}

export function ActivityChart() {
  const [data, setData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWeeklyData = async () => {
      try {
        const [orders, users] = await Promise.all([getOrders(), getUsers()])

        const now = new Date()
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const weekData: DayData[] = []

        for (let i = 6; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          const dayStart = new Date(date)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(date)
          dayEnd.setHours(23, 59, 59, 999)

          const dayOrders = orders.filter((o) => {
            const created = new Date(o.createdAt)
            return created >= dayStart && created <= dayEnd
          }).length

          const dayUsers = users.filter((u) => {
            const created = new Date(u.createdAt)
            return created >= dayStart && created <= dayEnd
          }).length

          weekData.push({
            name: dayNames[date.getDay()],
            orders: dayOrders,
            users: dayUsers,
          })
        }

        setData(weekData)
      } catch (error) {
        console.error("Failed to load weekly activity:", error)
      } finally {
        setLoading(false)
      }
    }

    loadWeeklyData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Activity</CardTitle>
        <CardDescription>Orders and new user registrations over the past week</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Bar dataKey="orders" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="users" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
