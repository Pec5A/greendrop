"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import {
  BarChart3,
  Truck,
  Monitor,
  Smartphone,
  Users,
  ExternalLink,
} from "lucide-react"

const dashboards = [
  {
    id: "kpi",
    labelEn: "Business KPIs",
    labelFr: "KPIs Métier",
    descEn: "Orders, revenue, users, drivers, verifications",
    descFr: "Commandes, revenu, utilisateurs, chauffeurs, vérifications",
    icon: BarChart3,
    color: "text-green-500",
    bg: "bg-green-500/10",
    url: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_KPI || "",
  },
  {
    id: "operations",
    labelEn: "Operations",
    labelFr: "Opérations",
    descEn: "Delivery times, driver utilization, orders by zone",
    descFr: "Durée livraison, utilisation chauffeurs, commandes par zone",
    icon: Truck,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    url: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_OPERATIONS || "",
  },
  {
    id: "admin",
    labelEn: "Admin Performance",
    labelFr: "Performance Admin",
    descEn: "Page views, API latency p50/p95/p99, error rates",
    descFr: "Pages vues, latence API p50/p95/p99, taux d'erreurs",
    icon: Monitor,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    url: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_ADMIN || "",
  },
  {
    id: "mobile",
    labelEn: "Mobile",
    labelFr: "Mobile",
    descEn: "App launches, sessions, API errors, version distribution",
    descFr: "Lancements, sessions, erreurs API, distribution versions",
    icon: Smartphone,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    url: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_MOBILE || "",
  },
  {
    id: "funnel",
    labelEn: "User Funnel",
    labelFr: "Funnel Utilisateurs",
    descEn: "DAU/WAU/MAU, signup-to-order rate, verification rate",
    descFr: "DAU/WAU/MAU, taux conversion inscription→commande, vérifications",
    icon: Users,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    url: process.env.NEXT_PUBLIC_GRAFANA_PUBLIC_FUNNEL || "",
  },
]

export default function MonitoringPage() {
  const { language } = useLanguage()

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            {language === "fr"
              ? "Dashboards temps réel de la plateforme — cliquez pour ouvrir dans Grafana"
              : "Real-time platform dashboards — click to open in Grafana"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d) => {
            const Icon = d.icon
            const label = language === "fr" ? d.labelFr : d.labelEn
            const desc = language === "fr" ? d.descFr : d.descEn

            return (
              <a
                key={d.id}
                href={d.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={d.url ? "group" : "pointer-events-none opacity-50"}
              >
                <Card className="h-full transition-all group-hover:shadow-md group-hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`rounded-lg p-3 ${d.bg}`}>
                        <Icon className={`h-6 w-6 ${d.color}`} />
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {desc}
                    </p>
                  </CardContent>
                </Card>
              </a>
            )
          })}
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {language === "fr"
              ? "Les alertes sont envoyées automatiquement sur Discord et en notification push quand un seuil critique est atteint (chauffeurs, litiges, erreurs, livraisons)."
              : "Alerts are automatically sent to Discord and as push notifications when critical thresholds are reached (drivers, disputes, errors, deliveries)."}
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
