"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import dynamic from "next/dynamic"
const ZoneMapEditor = dynamic(() => import("@/components/admin/zone-map-editor").then((m) => m.ZoneMapEditor), {
  ssr: false,
})
import { EntityDrawer } from "@/components/admin/entity-drawer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { MapPin, UploadCloud, FileJson, ClipboardList, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { useLegalZones } from "@/hooks/use-legal-zones"
import type { LegalZoneExtended } from "@/lib/firebase/services/legal-zones"
import { legalZonesToGeoJSON, geoJSONToLegalZones } from "@/lib/utils/geojson"
import { getActivityLogsByEntity, type ActivityLog } from "@/lib/firebase/services/activity-logs"

type Zone = LegalZoneExtended

export default function LegalZonesPage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const { zones, loading, error, saveAllZones, toggleLegalZoneActive, stats } = useLegalZones()
  const [isSavingZones, setIsSavingZones] = useState(false)
  const [importingGeoJSON, setImportingGeoJSON] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [zoneLogs, setZoneLogs] = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) || null, [zones, selectedZoneId])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveZones = async (newZones: any[]) => {
    try {
      setIsSavingZones(true)
      await saveAllZones(
        newZones.map((zone) => ({
          ...zone,
          color: zone.color || (zone.type === "delivery" ? "#10b981" : "#ef4444"),
          active: zone.active ?? true,
        })) as Zone[]
      )
      toast({
        title: t("language") === "fr" ? "Zones sauvegardées" : "Zones saved",
        description:
          t("language") === "fr"
            ? `${newZones.length} zones ont été sauvegardées avec succès`
            : `${newZones.length} zones saved successfully`,
      })
    } catch (err) {
      console.error("Error saving zones", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description: t("language") === "fr" ? "Impossible d'enregistrer les zones" : "Unable to save zones",
        variant: "destructive",
      })
    } finally {
      setIsSavingZones(false)
    }
  }

  const handleToggleZoneActive = async (zone: Zone, active: boolean) => {
    try {
      await toggleLegalZoneActive(zone.id, active, zone.name)
      toast({
        title:
          t("language") === "fr"
            ? active
              ? "Zone activée"
              : "Zone désactivée"
            : active
              ? "Zone activated"
              : "Zone disabled",
        description:
          t("language") === "fr"
            ? `La zone ${zone.name} est ${active ? "accessible" : "bloquée"}`
            : `${zone.name} is now ${active ? "active" : "blocked"}`,
      })
    } catch (err) {
      console.error("Error toggling zone", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description: t("language") === "fr" ? "Impossible de mettre à jour le statut" : "Unable to update zone status",
        variant: "destructive",
      })
    }
  }

  const downloadGeoJSON = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/geo+json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.geojson`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportGeoJSON = () => {
    if (!zones.length) {
      toast({
        title: t("language") === "fr" ? "Aucune zone" : "No zones",
        description: t("language") === "fr" ? "Ajoutez une zone avant d'exporter" : "Create a zone before exporting",
        variant: "destructive",
      })
      return
    }
    const geojson = legalZonesToGeoJSON(zones)
    downloadGeoJSON(geojson, `legal-zones-${new Date().toISOString().split("T")[0]}`)
    toast({
      title: t("language") === "fr" ? "Export GeoJSON" : "GeoJSON export",
      description: t("language") === "fr" ? `${zones.length} zones exportées` : `Exported ${zones.length} zones`,
    })
  }

  const handleImportGeoJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImportingGeoJSON(true)
      const text = await file.text()
      const parsed = JSON.parse(text)
      const importedZones = geoJSONToLegalZones(parsed)

      if (!importedZones.length) {
        toast({
          title: t("language") === "fr" ? "Import invalide" : "Invalid import",
          description:
            t("language") === "fr" ? "Aucune zone exploitable dans ce fichier" : "No valid zones found in the file",
          variant: "destructive",
        })
        return
      }

      await handleSaveZones(importedZones as Zone[])
      toast({
        title: t("language") === "fr" ? "Import GeoJSON" : "GeoJSON import",
        description:
          t("language") === "fr" ? `${importedZones.length} zones importées` : `${importedZones.length} zones imported`,
      })
    } catch (err) {
      console.error("Error importing GeoJSON", err)
      toast({
        title: t("language") === "fr" ? "Import échoué" : "Import failed",
        description:
          t("language") === "fr" ? "Vérifiez le format du fichier GeoJSON" : "Please verify the GeoJSON file format",
        variant: "destructive",
      })
    } finally {
      setImportingGeoJSON(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  useEffect(() => {
    if (!selectedZoneId) {
      setZoneLogs([])
      return
    }

    setLogsLoading(true)
    getActivityLogsByEntity("legalZone", selectedZoneId)
      .then((logs) => setZoneLogs(logs))
      .catch((err) => {
        console.error("Error fetching zone logs", err)
        toast({
          title: t("language") === "fr" ? "Logs indisponibles" : "Logs unavailable",
          description:
            t("language") === "fr"
              ? "Impossible de récupérer l'historique de cette zone"
              : "Unable to fetch activity for this zone",
          variant: "destructive",
        })
      })
      .finally(() => setLogsLoading(false))
  }, [selectedZoneId, toast, t])

  const typeLabel = (type: Zone["type"]) => (type === "delivery" ? t("deliveryZone") : t("restrictedZone"))

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("legalZones")}</h1>
          <p className="text-muted-foreground mt-1">{t("manageLegalZones")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("language") === "fr" ? "Total" : "Total"}</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("deliveryZone")}</CardDescription>
              <CardTitle className="text-3xl">{stats.delivery}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("restrictedZone")}</CardDescription>
              <CardTitle className="text-3xl">{stats.restricted}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("language") === "fr" ? "Actives" : "Active"}</CardDescription>
              <CardTitle className="text-3xl">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {t("language") === "fr" ? "Erreur lors du chargement des zones" : "Failed to load legal zones"}
            <span className="ml-2 text-xs text-destructive/80">{error.message}</span>
          </div>
        )}

        {loading && (
          <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("language") === "fr" ? "Chargement des zones en cours..." : "Loading zones from the database..."}
          </div>
        )}

        {isSavingZones && (
          <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
            {t("language") === "fr" ? "Enregistrement des zones..." : "Saving zones..."}
          </div>
        )}

        <Tabs defaultValue="editor" className="space-y-4">
          <TabsList>
            <TabsTrigger value="editor">{t("language") === "fr" ? "Éditeur de Carte" : "Map Editor"}</TabsTrigger>
            <TabsTrigger value="zones">
              {t("language") === "fr" ? "Liste des Zones" : "Zone List"}
              <Badge className="ml-2" variant="secondary">
                {zones.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {t("language") === "fr" ? "Éditeur de Zone Interactif" : "Interactive Zone Editor"}
                  </CardTitle>
                  <CardDescription>{t("drawOnMap")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleExportGeoJSON} size="sm">
                    <FileJson className="mr-2 h-4 w-4" />
                    GeoJSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importingGeoJSON}
                  >
                    {importingGeoJSON ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("language") === "fr" ? "Import..." : "Import..."}
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {t("language") === "fr" ? "Importer" : "Import"}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ZoneMapEditor initialZones={zones} onSave={handleSaveZones} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zones" className="space-y-4">
            {zones.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="h-6 w-6" />
                  {t("language") === "fr" ? "Aucune zone configurée pour le moment" : "No zones configured yet"}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {zones.map((zone) => (
                  <Card key={zone.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
                          <CardTitle className="text-lg">{zone.name}</CardTitle>
                        </div>
                        <Badge variant={zone.type === "delivery" ? "default" : "destructive"}>
                          {typeLabel(zone.type)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {zone.coordinates.length} {t("language") === "fr" ? "points" : "points"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {zone.active
                              ? t("language") === "fr"
                                ? "Active"
                                : "Active"
                              : t("language") === "fr"
                                ? "Bloquée"
                                : "Blocked"}
                          </span>
                          <Switch
                            checked={zone.active}
                            onCheckedChange={(checked) => handleToggleZoneActive(zone, checked)}
                          />
                        </div>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-3 max-h-32 overflow-auto text-xs">
                        {zone.coordinates.map((coord, index) => (
                          <div key={`${zone.id}-${index}`}>
                            {t("language") === "fr" ? "Point" : "Point"} {index + 1}: [{coord.x.toFixed(0)},{" "}
                            {coord.y.toFixed(0)}]
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedZoneId(zone.id)}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        {t("language") === "fr" ? "Voir les logs" : "View logs"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/geo+json,.geojson,.json"
        className="hidden"
        onChange={handleImportGeoJSON}
      />

      <EntityDrawer
        open={!!selectedZone}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedZoneId(null)
          }
        }}
        title={selectedZone?.name || "Zone"}
        description={selectedZone ? typeLabel(selectedZone.type) : undefined}
      >
        {selectedZone ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 p-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    {t("language") === "fr" ? "Statut" : "Status"}
                  </p>
                  <p className="text-base font-semibold">
                    {selectedZone.active
                      ? t("language") === "fr"
                        ? "Active"
                        : "Active"
                      : t("language") === "fr"
                        ? "Bloquée"
                        : "Blocked"}
                  </p>
                </div>
                <Badge variant={selectedZone.type === "delivery" ? "default" : "destructive"}>
                  {typeLabel(selectedZone.type)}
                </Badge>
              </div>
              <Separator className="my-4" />
              <div className="grid gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("language") === "fr" ? "Points" : "Points"}</span>
                  <span className="font-semibold">{selectedZone.coordinates.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Color</span>
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedZone.color }} />
                    {selectedZone.color}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {t("language") === "fr" ? "Logs de blocage" : "Zone logs"}
                </h4>
                {logsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <Separator className="my-3" />
              {zoneLogs.length === 0 && !logsLoading ? (
                <p className="text-xs text-muted-foreground">
                  {t("language") === "fr" ? "Aucun log pour cette zone" : "No activity recorded for this zone"}
                </p>
              ) : (
                <ScrollArea className="max-h-64 pr-2">
                  <div className="space-y-3">
                    {zoneLogs.map((log) => {
                      const isBlockLog = log.metadata?.active === false
                      return (
                        <div
                          key={log.id}
                          className={`rounded-md border p-3 text-xs ${isBlockLog ? "border-destructive/40 bg-destructive/5" : "border-border/60"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold capitalize">{log.type.replace("_", " ")}</span>
                            <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-sm">{log.message}</p>
                          {log.metadata && (
                            <pre className="mt-2 rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("language") === "fr" ? "Sélectionnez une zone" : "Select a zone"}
          </p>
        )}
      </EntityDrawer>
    </AdminLayout>
  )
}
