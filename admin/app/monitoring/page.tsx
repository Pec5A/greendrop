"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/language-context"
import { ExternalLink } from "lucide-react"

const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || ""

/**
 * Each dashboard can be embedded via its Grafana Public Dashboard URL.
 * To get the public URL:
 *   1. Open the dashboard in Grafana
 *   2. Click Share → Public dashboard → Enable
 *   3. Copy the public URL
 *   4. Set it in admin/.env as NEXT_PUBLIC_GRAFANA_PUBLIC_<ID>
 *
 * Falls back to a direct link to Grafana if no public URL is set.
 */
const dashboards = [
  {
    id: "kpi",
    uid: "greendrop-kpi",
    labelEn: "Business KPIs",
    labelFr: "KPIs Métier",
    publicUrl: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_KPI || "",
  },
  {
    id: "operations",
    uid: "greendrop-operations",
    labelEn: "Operations",
    labelFr: "Opérations",
    publicUrl: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_OPERATIONS || "",
  },
  {
    id: "admin",
    uid: "greendrop-admin",
    labelEn: "Admin Performance",
    labelFr: "Performance Admin",
    publicUrl: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_ADMIN || "",
  },
  {
    id: "mobile",
    uid: "greendrop-mobile",
    labelEn: "Mobile",
    labelFr: "Mobile",
    publicUrl: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_MOBILE || "",
  },
  {
    id: "funnel",
    uid: "greendrop-funnel",
    labelEn: "User Funnel",
    labelFr: "Funnel Utilisateurs",
    publicUrl: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_FUNNEL || "",
  },
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

          {dashboards.map((d) => {
            const label = language === "fr" ? d.labelFr : d.labelEn
            const directUrl = GRAFANA_URL
              ? `${GRAFANA_URL}/d/${d.uid}?orgId=1&theme=light`
              : ""

            // Public dashboard URL available → embed as iframe
            if (d.publicUrl) {
              return (
                <TabsContent key={d.id} value={d.id} className="mt-4">
                  <div className="flex justify-end mb-2">
                    <a
                      href={d.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {language === "fr" ? "Ouvrir dans Grafana" : "Open in Grafana"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <iframe
                    src={d.publicUrl}
                    className="w-full rounded-lg border"
                    style={{ height: "calc(100vh - 250px)", minHeight: "600px" }}
                    title={label}
                  />
                </TabsContent>
              )
            }

            // No public URL → show link to open in Grafana directly
            return (
              <TabsContent key={d.id} value={d.id} className="mt-4">
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 gap-4">
                  <div className="text-4xl">📊</div>
                  <h3 className="text-lg font-semibold">{label}</h3>
                  <p className="text-muted-foreground text-center max-w-md text-sm">
                    {language === "fr"
                      ? "Activez le Public Dashboard dans Grafana pour l'afficher ici, ou ouvrez-le directement."
                      : "Enable Public Dashboard in Grafana to display it here, or open it directly."}
                  </p>
                  {directUrl && (
                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {language === "fr" ? "Ouvrir dans Grafana" : "Open in Grafana"}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {!directUrl && (
                    <p className="text-xs text-muted-foreground">
                      {language === "fr"
                        ? "Configurez NEXT_PUBLIC_GRAFANA_URL dans .env"
                        : "Set NEXT_PUBLIC_GRAFANA_URL in .env"}
                    </p>
                  )}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </AdminLayout>
  )
}
