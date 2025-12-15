"use client"

import { useMemo, useState, useEffect } from "react"
import type { Driver, DriverStatus } from "@/lib/types"
import { AdminLayout } from "@/components/admin/admin-layout"
import { KPICard } from "@/components/admin/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup, useMap } from "@/components/ui/map"
import { useDrivers } from "@/hooks/use-drivers"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import {
  Activity,
  Loader2,
  MapPin,
  Navigation,
  Radar,
  RefreshCw,
  Smartphone,
  Star,
  Car,
  UserCheck,
  UserPlus,
  Package,
  Clock,
  Phone,
  Play,
  Square,
} from "lucide-react"
import { CreateDriverModal } from "@/components/admin/action-modals"
import { startSimulation, stopSimulation, isSimulationActive } from "@/lib/firebase/services/driver-simulation"
import { toast as sonnerToast } from "sonner"

const statusBadges: Record<DriverStatus, string> = {
  online: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  busy: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  offline: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  break: "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

const statusColors = {
  online: "#10b981",
  busy: "#f59e0b",
  offline: "#6b7280",
  break: "#3b82f6",
}

const statusLabels = {
  online: "En ligne",
  busy: "Occupé",
  offline: "Hors ligne",
  break: "Pause",
}

export default function DriversPage() {
  const { drivers, stats, loading, error, updateDriverStatus, releaseDriver } = useDrivers()
  const { toast } = useToast()
  const { t } = useLanguage()
  const isFrench = t("language") === "fr"

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [releasingId, setReleasingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const avgRatingDisplay = Number.isFinite(stats.averageRating) ? stats.averageRating.toFixed(1) : "0.0"

  // Vérifier l'état de la simulation au chargement
  useEffect(() => {
    setSimulating(isSimulationActive())
  }, [])

  // Nettoyer la simulation au démontage du composant
  useEffect(() => {
    return () => {
      if (isSimulationActive()) {
        stopSimulation()
      }
    }
  }, [])

  const handleToggleSimulation = async () => {
    try {
      if (simulating) {
        stopSimulation()
        setSimulating(false)
        sonnerToast.info("🛑 Simulation arrêtée", {
          description: "Les chauffeurs ne bougeront plus",
        })
      } else {
        await startSimulation()
        setSimulating(true)
        sonnerToast.success("🚀 Simulation démarrée", {
          description: "Les chauffeurs se déplacent automatiquement",
        })
      }
    } catch (error: any) {
      console.error("Erreur simulation:", error)
      sonnerToast.error("❌ Erreur", {
        description: error.message || "Impossible de démarrer la simulation",
      })
    }
  }

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return drivers.filter((driver) => {
      const matchesQuery =
        query.length === 0 ||
        [driver.name, driver.email, driver.vehicleType].some((value) => value?.toLowerCase().includes(query))
      const matchesStatus = statusFilter === "all" || driver.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [drivers, search, statusFilter])

  const handleStatusChange = async (driver: Driver, nextStatus: DriverStatus) => {
    if (driver.status === nextStatus) return
    try {
      setStatusUpdatingId(driver.id)
      await updateDriverStatus(driver.id, nextStatus, driver.name)
      toast({
        title: isFrench ? "Statut mis à jour" : "Status updated",
        description: `${driver.name} · ${nextStatus}`,
      })
    } catch (err) {
      console.error("Error updating driver status", err)
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench ? "Impossible de mettre à jour" : "Unable to update status",
        variant: "destructive",
      })
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const handleReleaseDriver = async (driverId: string) => {
    try {
      setReleasingId(driverId)
      await releaseDriver(driverId)
      toast({
        title: isFrench ? "Course libérée" : "Driver released",
        description: isFrench ? "Le chauffeur est disponible" : "Driver is now available",
      })
    } catch (err) {
      console.error("Error releasing driver", err)
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench ? "Impossible de libérer" : "Unable to release driver",
        variant: "destructive",
      })
    } finally {
      setReleasingId(null)
    }
  }

  const driverStatusLabels: Record<DriverStatus, string> = {
    online: isFrench ? "En ligne" : "Online",
    offline: isFrench ? "Hors ligne" : "Offline",
    busy: isFrench ? "Occupé" : "Busy",
    break: isFrench ? "En pause" : "On break",
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("drivers")}</h1>
            <p className="text-muted-foreground mt-1">{t("driverOperations")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleToggleSimulation} variant={simulating ? "destructive" : "default"} className="gap-2">
              {simulating ? (
                <>
                  <Square className="h-4 w-4" />
                  {isFrench ? "Arrêter simulation" : "Stop simulation"}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {isFrench ? "Démo Live" : "Live Demo"}
                </>
              )}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {isFrench ? "Nouveau chauffeur" : "New driver"}
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isFrench ? "Actualiser" : "Refresh data"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title={isFrench ? "Chauffeurs en ligne" : "Drivers online"}
            value={(stats.online ?? 0).toLocaleString()}
            icon={<Navigation className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "En course" : "On a job"}
            value={(stats.busy ?? 0).toLocaleString()}
            icon={<Activity className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "Courses actives" : "Active deliveries"}
            value={(stats.activeDeliveries ?? 0).toLocaleString()}
            icon={<Car className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "Note moyenne" : "Avg rating"}
            value={avgRatingDisplay}
            icon={<Star className="h-4 w-4" />}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error.message}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
            {isFrench ? "Synchronisation de la flotte..." : "Syncing fleet data..."}
          </div>
        )}

        {/* Tabs for Map and List views */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-2" />
              {isFrench ? "Carte" : "Map"}
            </TabsTrigger>
            <TabsTrigger value="list">
              <Car className="h-4 w-4 mr-2" />
              {isFrench ? "Liste" : "List"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <DriversMapView drivers={filteredDrivers} isFrench={isFrench} />
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <div className="grid gap-6 xl:grid-cols-[2fr_1.2fr]">
              <Card className="order-2 xl:order-1">
                <CardHeader className="space-y-2">
                  <CardTitle>{isFrench ? "Flotte en temps réel" : "Real-time fleet"}</CardTitle>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Input
                        placeholder={isFrench ? "Rechercher un chauffeur..." : "Search drivers..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("status")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("allOrders")}</SelectItem>
                        <SelectItem value="online">{driverStatusLabels.online}</SelectItem>
                        <SelectItem value="busy">{driverStatusLabels.busy}</SelectItem>
                        <SelectItem value="break">{driverStatusLabels.break}</SelectItem>
                        <SelectItem value="offline">{driverStatusLabels.offline}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[520px] pr-4">
                    <div className="space-y-4">
                      {filteredDrivers.length === 0 && (
                        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
                          {isFrench ? "Aucun chauffeur" : "No drivers match your filters"}
                        </div>
                      )}

                      {filteredDrivers.map((driver) => (
                        <div key={driver.id} className="rounded-xl border bg-card/70 p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold">{driver.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {driver.vehicleType} · {driver.phone}
                              </p>
                            </div>
                            <Badge variant="outline" className={statusBadges[driver.status]}>
                              {driverStatusLabels[driver.status]}
                            </Badge>
                          </div>

                          <div className="mt-3 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              {driver.location
                                ? `${driver.location.lat.toFixed(3)}, ${driver.location.lng.toFixed(3)}`
                                : isFrench
                                  ? "Position inconnue"
                                  : "Unknown"}
                            </div>
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-3.5 w-3.5" />
                              {driver.lastSeenAt
                                ? new Date(driver.lastSeenAt).toLocaleTimeString()
                                : isFrench
                                  ? "Pas de signal"
                                  : "No ping"}
                            </div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-3.5 w-3.5" />
                              {driver.currentOrderId ? driver.currentOrderId : isFrench ? "Disponible" : "Available"}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Select
                              value={driver.status}
                              onValueChange={(value) => handleStatusChange(driver, value as DriverStatus)}
                              disabled={statusUpdatingId === driver.id || releasingId === driver.id}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="online">{driverStatusLabels.online}</SelectItem>
                                <SelectItem value="busy">{driverStatusLabels.busy}</SelectItem>
                                <SelectItem value="break">{driverStatusLabels.break}</SelectItem>
                                <SelectItem value="offline">{driverStatusLabels.offline}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              className="bg-transparent"
                              onClick={() => handleReleaseDriver(driver.id)}
                              disabled={releasingId === driver.id || statusUpdatingId === driver.id}
                            >
                              {releasingId === driver.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {isFrench ? "Libération..." : "Releasing..."}
                                </>
                              ) : (
                                <>
                                  <Radar className="mr-2 h-4 w-4" />
                                  {isFrench ? "Libérer" : "Release"}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="order-1 xl:order-2">
                <CardHeader>
                  <CardTitle>{isFrench ? "Carte en direct" : "Live map"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FleetMap drivers={drivers} driverStatusLabels={driverStatusLabels} isFrench={isFrench} />
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      {isFrench ? "Connectés" : "Online"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      {isFrench ? "En course" : "On a job"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-blue-500" />
                      {isFrench ? "Pause" : "On break"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-slate-400" />
                      {isFrench ? "Hors ligne" : "Offline"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateDriverModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </AdminLayout>
  )
}

function FleetMap({
  drivers,
  driverStatusLabels,
  isFrench,
}: {
  drivers: Driver[]
  driverStatusLabels: Record<DriverStatus, string>
  isFrench: boolean
}) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const driversWithLocations = drivers.filter((driver) => driver.location)

  if (driversWithLocations.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          {isFrench ? "Aucune position GPS pour l'instant" : "No GPS data available yet."}
        </p>
      </div>
    )
  }

  const parisCenter: [number, number] = [2.3522, 48.8566]

  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden border">
      <Map center={parisCenter} zoom={11}>
        <MapControls position="top-right" showZoom />

        {driversWithLocations.map((driver) => (
          <MapMarker
            key={driver.id}
            longitude={driver.location!.lng}
            latitude={driver.location!.lat}
            onClick={() => setSelectedDriver(driver)}
          >
            <MarkerContent>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="rounded-full border-2 border-white px-3 py-1 text-xs font-semibold shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    backgroundColor:
                      driver.status === "online"
                        ? "rgba(16, 185, 129, 0.9)"
                        : driver.status === "busy"
                          ? "rgba(245, 158, 11, 0.9)"
                          : driver.status === "break"
                            ? "rgba(59, 130, 246, 0.9)"
                            : "rgba(148, 163, 184, 0.9)",
                  }}
                >
                  {driver.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow">
                  {driverStatusLabels[driver.status]}
                </div>
              </div>
            </MarkerContent>

            {selectedDriver?.id === driver.id && (
              <MarkerPopup closeButton>
                <div className="min-w-[200px] space-y-2">
                  <div>
                    <p className="font-semibold text-sm">{driver.name}</p>
                    <Badge variant="secondary" className={statusBadges[driver.status]}>
                      {statusLabels[driver.status]}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Car className="h-3 w-3 text-muted-foreground" />
                      <span>{driver.vehicleType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{driver.phone}</span>
                    </div>
                  </div>
                </div>
              </MarkerPopup>
            )}
          </MapMarker>
        ))}
      </Map>
    </div>
  )
}

// New Map View Component using MapCN
function DriversMapView({ drivers, isFrench }: { drivers: Driver[]; isFrench: boolean }) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)

  const onlineDrivers = drivers.filter((d) => d.status !== "offline")
  const parisCenter: [number, number] = [2.3522, 48.8566]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Map */}
      <Card className="lg:col-span-2">
        <CardContent className="p-0">
          <div className="h-[600px] rounded-lg overflow-hidden">
            <Map center={parisCenter} zoom={12}>
              <MapControls position="top-right" showZoom showFullscreen showLocate />

              {drivers
                .filter((driver) => driver.location && driver.status !== "offline")
                .map((driver) => (
                  <MapMarker
                    key={driver.id}
                    longitude={driver.location!.lng}
                    latitude={driver.location!.lat}
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <MarkerContent>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: statusColors[driver.status] }}
                      />
                    </MarkerContent>
                    {selectedDriver?.id === driver.id && (
                      <MarkerPopup closeButton>
                        <div className="min-w-[250px] space-y-3">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {driver.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{driver.name}</p>
                              <Badge variant="secondary" className={statusBadges[driver.status]}>
                                {statusLabels[driver.status]}
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {driver.vehicleType} - {driver.vehiclePlate}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{driver.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {driver.location!.lat.toFixed(4)}, {driver.location!.lng.toFixed(4)}
                              </span>
                            </div>
                            {driver.lastSeenAt && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {isFrench ? "Dernière activité: " : "Last seen: "}
                                  {new Date(driver.lastSeenAt).toLocaleTimeString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </MarkerPopup>
                    )}
                  </MapMarker>
                ))}
            </Map>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle>{isFrench ? "Chauffeurs actifs" : "Active Drivers"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[540px]">
            <div className="space-y-4">
              {onlineDrivers.length === 0 && (
                <div className="text-center text-sm text-muted-foreground p-4">
                  {isFrench ? "Aucun chauffeur actif" : "No active drivers"}
                </div>
              )}
              {onlineDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSelectedDriver(driver)}
                >
                  <Avatar>
                    <AvatarFallback>
                      {driver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{driver.name}</p>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[driver.status] }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {driver.vehicleType} • {driver.vehiclePlate}
                    </p>
                    {driver.lastSeenAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(driver.lastSeenAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
