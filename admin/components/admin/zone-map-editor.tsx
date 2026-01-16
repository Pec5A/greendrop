"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Map, MapControls, useMap } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { MapPin, Plus, Trash2, Save, X, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type MapLibreGL from "maplibre-gl"

interface Coordinate {
  x: number
  y: number
}

interface Zone {
  id: string
  name: string
  type: "delivery" | "restricted"
  coordinates: Coordinate[]
  color?: string
  active?: boolean
}

interface ZoneMapEditorProps {
  initialZones?: Zone[]
  onSave?: (zones: Zone[]) => void
}

// Conversion entre coordonnées carte (x,y pixels) et géographiques (lng,lat)
const PARIS_CENTER = { lng: 2.3522, lat: 48.8566 }
const MAP_BOUNDS = {
  west: 2.2,
  east: 2.5,
  south: 48.8,
  north: 48.92
}

function pixelToGeo(x: number, y: number) {
  // Normaliser x,y de 0-800 à longitude/latitude
  const lng = MAP_BOUNDS.west + (x / 800) * (MAP_BOUNDS.east - MAP_BOUNDS.west)
  const lat = MAP_BOUNDS.north - (y / 600) * (MAP_BOUNDS.north - MAP_BOUNDS.south)
  return { lng, lat }
}

function geoToPixel(lng: number, lat: number) {
  const x = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 800
  const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 600
  return { x, y }
}

function ZoneEditor({ initialZones = [], onSave }: { initialZones: Zone[], onSave?: (zones: Zone[]) => void }) {
  const { map, isLoaded } = useMap()
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [currentZone, setCurrentZone] = useState<Zone | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [editName, setEditName] = useState("")
  const sourceIdsRef = useRef<Set<string>>(new Set())

  const colors = {
    delivery: "#10b981",
    restricted: "#ef4444",
  }

  // Nettoyer les sources/layers existants
  const cleanupLayers = useCallback(() => {
    if (!map || !isLoaded) return
    sourceIdsRef.current.forEach(sourceId => {
      const layerId = `${sourceId}-fill`
      const lineId = `${sourceId}-line`
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getLayer(lineId)) map.removeLayer(lineId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch (e) {
        // Ignorer les erreurs de nettoyage
      }
    })
    sourceIdsRef.current.clear()
  }, [map, isLoaded])

  // Dessiner toutes les zones
  useEffect(() => {
    if (!map || !isLoaded) return

    cleanupLayers()

    zones.forEach(zone => {
      if (zone.coordinates.length < 3) return

      const sourceId = `zone-${zone.id}`
      sourceIdsRef.current.add(sourceId)

      // Convertir x,y en lng,lat
      const coordinates = [
        ...zone.coordinates.map(c => {
          const geo = pixelToGeo(c.x, c.y)
          return [geo.lng, geo.lat]
        }),
        (() => {
          const geo = pixelToGeo(zone.coordinates[0].x, zone.coordinates[0].y)
          return [geo.lng, geo.lat]
        })()
      ]

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        }
      })

      map.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': zone.color || colors[zone.type],
          'fill-opacity': 0.3
        }
      })

      map.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': zone.color || colors[zone.type],
          'line-width': 2
        }
      })
    })

    return () => cleanupLayers()
  }, [map, isLoaded, zones, colors, cleanupLayers])

  const handleMapClick = useCallback((e: MapLibreGL.MapMouseEvent) => {
    if (!isDrawing || !currentZone) return

    const { lng, lat } = e.lngLat
    const pixel = geoToPixel(lng, lat)
    const newCoordinate = { x: pixel.x, y: pixel.y }

    setCurrentZone(prev => ({
      ...prev!,
      coordinates: [...prev!.coordinates, newCoordinate]
    }))
  }, [isDrawing, currentZone])

  useEffect(() => {
    if (!map) return
    
    if (isDrawing) {
      map.getCanvas().style.cursor = 'crosshair'
      map.on('click', handleMapClick)
    } else {
      map.getCanvas().style.cursor = ''
      map.off('click', handleMapClick)
    }

    return () => {
      map.off('click', handleMapClick)
    }
  }, [map, isDrawing, handleMapClick])

  const startZone = (type: "delivery" | "restricted") => {
    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name: type === "delivery" ? "Zone de Livraison" : "Zone Restreinte",
      type,
      coordinates: [],
      color: colors[type],
      active: true,
    }
    setCurrentZone(newZone)
    setIsDrawing(true)
  }

  const finishZone = () => {
    if (currentZone && currentZone.coordinates.length >= 3) {
      setZones(prev => [...prev, currentZone])
    }
    setCurrentZone(null)
    setIsDrawing(false)
  }

  const cancelZone = () => {
    setCurrentZone(null)
    setIsDrawing(false)
  }

  const deleteZone = (zoneId: string) => {
    setZones(prev => prev.filter(z => z.id !== zoneId))
  }

  const startEditZone = (zone: Zone) => {
    setEditingZone(zone)
    setEditName(zone.name)
  }

  const saveEditZone = () => {
    if (editingZone) {
      setZones(prev =>
        prev.map(z => (z.id === editingZone.id ? { ...z, name: editName } : z))
      )
      setEditingZone(null)
      setEditName("")
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave(zones)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <Card className="p-3 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => startZone("delivery")}
              disabled={isDrawing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Zone de Livraison
            </Button>
            <Button
              size="sm"
              onClick={() => startZone("restricted")}
              disabled={isDrawing}
              variant="destructive"
            >
              <Plus className="h-4 w-4 mr-1" />
              Zone Restreinte
            </Button>
          </div>

          {isDrawing && (
            <div className="flex gap-2 p-2 bg-muted rounded-lg">
              <Button size="sm" onClick={finishZone}>
                <Save className="h-4 w-4 mr-1" />
                Sauvegarder Tout
              </Button>
              <Button size="sm" variant="outline" onClick={cancelZone}>
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
              <Badge variant="secondary">
                {currentZone?.coordinates.length || 0} points
              </Badge>
            </div>
          )}
        </Card>

        {/* Liste des zones */}
        {zones.length > 0 && (
          <Card className="p-3 max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {zones.map(zone => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between gap-2 p-2 border rounded-lg"
                  style={{ borderColor: zone.color }}
                >
                  {editingZone?.id === zone.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7"
                    />
                  ) : (
                    <div className="flex-1">
                      <div className="font-medium text-sm">{zone.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {zone.coordinates.length} points
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1">
                    {editingZone?.id === zone.id ? (
                      <Button size="sm" variant="ghost" onClick={saveEditZone}>
                        <Save className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditZone(zone)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteZone(zone.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Bouton Sauvegarder global */}
      {zones.length > 0 && !isDrawing && (
        <div className="absolute top-4 right-20 z-10">
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder Tout
          </Button>
        </div>
      )}

      {/* Dessiner la zone en cours */}
      {currentZone && currentZone.coordinates.length > 0 && map && (
        <ZonePreview zone={currentZone} />
      )}
    </>
  )
}

// Composant pour prévisualiser la zone en cours de dessin
function ZonePreview({ zone }: { zone: Zone }) {
  const { map, isLoaded } = useMap()
  const sourceId = 'current-zone-preview'

  useEffect(() => {
    if (!map || !isLoaded || zone.coordinates.length === 0) return

    const cleanup = () => {
      try {
        if (map.getLayer(`${sourceId}-line`)) map.removeLayer(`${sourceId}-line`)
        if (map.getLayer(`${sourceId}-points`)) map.removeLayer(`${sourceId}-points`)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
        if (map.getSource(`${sourceId}-points`)) map.removeSource(`${sourceId}-points`)
      } catch (e) {
        // Ignorer les erreurs
      }
    }

    cleanup()

    const coordinates = zone.coordinates.map(c => {
      const geo = pixelToGeo(c.x, c.y)
      return [geo.lng, geo.lat]
    })

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      }
    })

    map.addLayer({
      id: `${sourceId}-line`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': zone.color || '#10b981',
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    })

    // Points
    map.addSource(`${sourceId}-points`, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: zone.coordinates.map((coord, i) => {
          const geo = pixelToGeo(coord.x, coord.y)
          return {
            type: 'Feature',
            properties: { index: i },
            geometry: {
              type: 'Point',
              coordinates: [geo.lng, geo.lat]
            }
          }
        })
      }
    })

    map.addLayer({
      id: `${sourceId}-points`,
      type: 'circle',
      source: `${sourceId}-points`,
      paint: {
        'circle-radius': 5,
        'circle-color': zone.color || '#10b981',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    })

    return () => {
      try {
        if (map.getLayer(`${sourceId}-line`)) map.removeLayer(`${sourceId}-line`)
        if (map.getLayer(`${sourceId}-points`)) map.removeLayer(`${sourceId}-points`)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
        if (map.getSource(`${sourceId}-points`)) map.removeSource(`${sourceId}-points`)
      } catch (e) {
        // Ignorer les erreurs
      }
    }
  }, [map, isLoaded, zone])

  return null
}

export function ZoneMapEditor({ initialZones = [], onSave }: ZoneMapEditorProps) {
  return (
    <div className="h-[600px] w-full relative rounded-lg overflow-hidden">
      <Map
        center={[2.3522, 48.8566]} // Paris
        zoom={12}
      >
        <MapControls position="top-right" showZoom showFullscreen />
        <ZoneEditor initialZones={initialZones} onSave={onSave} />
      </Map>
    </div>
  )
}
