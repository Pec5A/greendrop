"use client"

import { useEffect, useState } from "react"
import { DollarSign, Users, FileCheck, AlertCircle } from "lucide-react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { KPICard } from "@/components/admin/kpi-card"
import dynamic from "next/dynamic"
const ActivityChart = dynamic(() => import("@/components/admin/activity-chart").then((m) => m.ActivityChart), {
  ssr: false,
})
import { RecentActivity } from "@/components/admin/recent-activity"
import { AnalyticsWidget } from "@/components/admin/analytics-widget"
import { ActivityLog } from "@/components/admin/activity-log"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/language-context"
import { getOrderStats } from "@/lib/firebase/services/orders"
import { getUsers } from "@/lib/firebase/services/users"
import { getVerificationStats } from "@/lib/firebase/services/verifications"
import { getDisputeStats } from "@/lib/firebase/services/disputes"

export default function DashboardPage() {
  const { t } = useLanguage()
  const [revenue, setRevenue] = useState("--")
  const [activeUsers, setActiveUsers] = useState("--")
  const [pendingVerifications, setPendingVerifications] = useState("--")
  const [openDisputes, setOpenDisputes] = useState("--")

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [orderStats, users, verificationStats, disputeStats] = await Promise.all([
          getOrderStats(),
          getUsers(),
          getVerificationStats(),
          getDisputeStats(),
        ])

        const revenueFormatted = orderStats.totalRevenue.toLocaleString("en-US", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        setRevenue(revenueFormatted)
        setActiveUsers(users.length.toLocaleString())
        setPendingVerifications(verificationStats.pending.toString())
        setOpenDisputes(disputeStats.open.toString())
      } catch (error) {
        console.error("Failed to load dashboard stats:", error)
      }
    }

    loadStats()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-muted-foreground mt-1">{t("overviewOfOperations")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title={t("totalRevenue")} value={revenue} icon={<DollarSign className="h-4 w-4" />} />
          <KPICard title={t("activeUsers")} value={activeUsers} icon={<Users className="h-4 w-4" />} />
          <KPICard
            title={t("pendingVerifications")}
            value={pendingVerifications}
            icon={<FileCheck className="h-4 w-4" />}
          />
          <KPICard title={t("openDisputes")} value={openDisputes} icon={<AlertCircle className="h-4 w-4" />} />
        </div>

        <AnalyticsWidget />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <ActivityChart />
          </div>
          <div className="lg:col-span-3">
            <RecentActivity />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("activityLog")}</CardTitle>
            <CardDescription>{t("recentActions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">{t("allActivity")}</TabsTrigger>
                <TabsTrigger value="today">{t("today")}</TabsTrigger>
                <TabsTrigger value="week">{t("thisWeek")}</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <ActivityLog />
              </TabsContent>
              <TabsContent value="today" className="mt-4">
                <ActivityLog />
              </TabsContent>
              <TabsContent value="week" className="mt-4">
                <ActivityLog />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
