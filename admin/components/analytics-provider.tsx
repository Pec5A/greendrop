"use client"

import { usePageAnalytics } from "@/hooks/use-page-analytics"

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  usePageAnalytics()
  return <>{children}</>
}
