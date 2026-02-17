"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/language-context"

const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || ""

const dashboards = [
  { id: "kpi", uid: "greendrop-kpi", labelEn: "Business KPIs", labelFr: "KPIs Métier" },
  { id: "operations", uid: "greendrop-operations", labelEn: "Operations", labelFr: "Opérations" },
  { id: "admin", uid: "greendrop-admin", labelEn: "Admin Performance", labelFr: "Performance Admin" },
  { id: "mobile", uid: "greendrop-mobile", labelEn: "Mobile", labelFr: "Mobile" },
  { id: "funnel", uid: "greendrop-funnel", labelEn: "User Funnel", labelFr: "Funnel Utilisateurs" },
] as const

export default function MonitoringPage() {
  const { language } = useLanguage()

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            {language === "fr"
              ? "Dashboards temps réel de la plateforme"
              : "Real-time platform dashboards"}
          </p>
        </div>

        <Tabs defaultValue="kpi" className="w-full">
          <TabsList>
            {dashboards.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>
                {language === "fr" ? d.labelFr : d.labelEn}
              </TabsTrigger>
            ))}
          </TabsList>

          {dashboards.map((d) => (
            <TabsContent key={d.id} value={d.id} className="mt-4">
              {GRAFANA_URL ? (
                <iframe
                  src={`${GRAFANA_URL}/d/${d.uid}?orgId=1&kiosk&theme=light`}
                  className="w-full rounded-lg border"
                  style={{ height: "calc(100vh - 220px)", minHeight: "600px" }}
                  title={language === "fr" ? d.labelFr : d.labelEn}
                />
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
                  {language === "fr"
                    ? "Configurez NEXT_PUBLIC_GRAFANA_URL dans .env pour afficher les dashboards"
                    : "Set NEXT_PUBLIC_GRAFANA_URL in .env to display dashboards"}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  )
}
