"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  sparklineData?: number[]
}

export function KPICard({ title, value, change, icon, sparklineData = [] }: KPICardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-500" />
            )}
            <span
              className={cn(isPositive ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}
            >
              {Math.abs(change)}%
            </span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        )}
        {sparklineData.length > 0 && (
          <div className="mt-3 h-12">
            <Sparkline data={sparklineData} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className="text-primary"
      />
    </svg>
  )
}
