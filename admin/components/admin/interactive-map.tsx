"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MapPin, Plus, Trash2, Save, X, Pencil } from "lucide-react"

interface Coordinate {
  x: number
  y: number
}

interface Zone {
  id: string
  name: string
  type: "delivery" | "restricted"
  coordinates: Coordinate[]
  color: string
  active?: boolean
}

interface InteractiveMapProps {
  initialZones?: Zone[]
  onSave?: (zones: Zone[]) => void
}

export function InteractiveMap({ initialZones = [], onSave }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [currentZone, setCurrentZone] = useState<Zone | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [editName, setEditName] = useState("")

  const colors = {
    delivery: "#10b981",
    restricted: "#ef4444",
  }

  useEffect(() => {
    setZones(initialZones)
  }, [initialZones])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (svgRef.current && map.contains(svgRef.current)) {
      try {
        map.removeChild(svgRef.current)
      } catch (e) {
        console.log("[v0] SVG already removed")
      }
      svgRef.current = null
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("width", "100%")
    svg.setAttribute("height", "100%")
    svg.setAttribute("viewBox", "0 0 800 600")
    svg.style.position = "absolute"
    svg.style.top = "0"
    svg.style.left = "0"
    svg.id = "map-svg"

    svgRef.current = svg

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern")
    pattern.setAttribute("id", "streets")
    pattern.setAttribute("width", "80")
    pattern.setAttribute("height", "80")
    pattern.setAttribute("patternUnits", "userSpaceOnUse")

    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line")
    line1.setAttribute("x1", "0")
    line1.setAttribute("y1", "40")
    line1.setAttribute("x2", "80")
    line1.setAttribute("y2", "40")
    line1.setAttribute("stroke", "#d1d5db")
    line1.setAttribute("stroke-width", "2")

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line")
    line2.setAttribute("x1", "40")
    line2.setAttribute("y1", "0")
    line2.setAttribute("x2", "40")
    line2.setAttribute("y2", "80")
    line2.setAttribute("stroke", "#d1d5db")
    line2.setAttribute("stroke-width", "2")

    pattern.appendChild(line1)
    pattern.appendChild(line2)
    defs.appendChild(pattern)
    svg.appendChild(defs)

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    bg.setAttribute("width", "800")
    bg.setAttribute("height", "600")
    bg.setAttribute("fill", "url(#streets)")
    svg.appendChild(bg)

    const landmarks = [
      { x: 150, y: 100, width: 100, height: 80, color: "#86efac", label: "Park" },
      { x: 450, y: 150, width: 120, height: 100, color: "#93c5fd", label: "Mall" },
      { x: 250, y: 350, width: 80, height: 60, color: "#fca5a5", label: "Hospital" },
      { x: 600, y: 400, width: 90, height: 70, color: "#fde047", label: "School" },
    ]

    landmarks.forEach((landmark) => {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      rect.setAttribute("x", landmark.x.toString())
      rect.setAttribute("y", landmark.y.toString())
      rect.setAttribute("width", landmark.width.toString())
      rect.setAttribute("height", landmark.height.toString())
      rect.setAttribute("fill", landmark.color)
      rect.setAttribute("opacity", "0.3")
      rect.setAttribute("rx", "4")
      svg.appendChild(rect)

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
      text.setAttribute("x", (landmark.x + landmark.width / 2).toString())
      text.setAttribute("y", (landmark.y + landmark.height / 2).toString())
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("dominant-baseline", "middle")
      text.setAttribute("fill", "#374151")
      text.setAttribute("font-size", "12")
      text.setAttribute("font-weight", "500")
      text.textContent = landmark.label
      svg.appendChild(text)
    })

    zones.forEach((zone) => {
      if (zone.coordinates.length < 3) return

      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
      const points = zone.coordinates.map(({ x, y }) => `${x},${y}`).join(" ")
      polygon.setAttribute("points", points)
      polygon.setAttribute("fill", zone.color)
      polygon.setAttribute("fill-opacity", "0.2")
      polygon.setAttribute("stroke", zone.color)
      polygon.setAttribute("stroke-width", "3")
      polygon.setAttribute("class", "zone-polygon")
      svg.appendChild(polygon)

      zone.coordinates.forEach(({ x, y }) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
        circle.setAttribute("cx", x.toString())
        circle.setAttribute("cy", y.toString())
        circle.setAttribute("r", "6")
        circle.setAttribute("fill", zone.color)
        circle.setAttribute("stroke", "white")
        circle.setAttribute("stroke-width", "2")
        svg.appendChild(circle)
      })
    })

    map.appendChild(svg)
    setMapLoaded(true)

    return () => {
      if (svgRef.current && map && map.contains(svgRef.current)) {
        try {
          map.removeChild(svgRef.current)
        } catch (e) {
          console.log("[v0] Cleanup: SVG already removed")
        }
        svgRef.current = null
      }
    }
  }, [zones])

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentZone) return

    const map = mapRef.current
    if (!map) return

    const rect = map.getBoundingClientRect()
    const scaleX = 800 / rect.width
    const scaleY = 600 / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setCurrentZone({
      ...currentZone,
      coordinates: [...currentZone.coordinates, { x, y }],
    })

    const svg = svgRef.current
    if (svg) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      circle.setAttribute("cx", x.toString())
      circle.setAttribute("cy", y.toString())
      circle.setAttribute("r", "6")
      circle.setAttribute("fill", currentZone.color)
      circle.setAttribute("stroke", "white")
      circle.setAttribute("stroke-width", "2")
      circle.setAttribute("class", "temp-point")
      svg.appendChild(circle)

      if (currentZone.coordinates.length > 0) {
        const prevPoint = currentZone.coordinates[currentZone.coordinates.length - 1]
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("x1", prevPoint.x.toString())
        line.setAttribute("y1", prevPoint.y.toString())
        line.setAttribute("x2", x.toString())
        line.setAttribute("y2", y.toString())
        line.setAttribute("stroke", currentZone.color)
        line.setAttribute("stroke-width", "3")
        line.setAttribute("class", "temp-line")
        svg.appendChild(line)
      }
    }
  }

  const startNewZone = (type: "delivery" | "restricted") => {
    setCurrentZone({
      id: `zone-${Date.now()}`,
      name: `${type === "delivery" ? "Zone de Livraison" : "Zone Restreinte"} ${zones.length + 1}`,
      type,
      coordinates: [],
      color: colors[type],
      active: true,
    })
    setIsDrawing(true)

    document.querySelectorAll(".temp-point, .temp-line").forEach((el) => el.remove())
  }

  const finishZone = () => {
    if (currentZone && currentZone.coordinates.length >= 3) {
      setZones([...zones, currentZone])
      setCurrentZone(null)
      setIsDrawing(false)

      document.querySelectorAll(".temp-point, .temp-line").forEach((el) => el.remove())
    }
  }

  const cancelZone = () => {
    setCurrentZone(null)
    setIsDrawing(false)

    document.querySelectorAll(".temp-point, .temp-line").forEach((el) => el.remove())
  }

  const deleteZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id))
  }

  const startEditZone = (zone: Zone) => {
    setEditingZone(zone)
    setEditName(zone.name)
  }

  const saveEditZone = () => {
    if (editingZone) {
      setZones(zones.map((z) => (z.id === editingZone.id ? { ...z, name: editName } : z)))
      setEditingZone(null)
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave(zones)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button onClick={() => startNewZone("delivery")} disabled={isDrawing} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Zone de Livraison
          </Button>
          <Button onClick={() => startNewZone("restricted")} disabled={isDrawing} variant="destructive" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Zone Restreinte
          </Button>
        </div>

        {isDrawing && (
          <div className="flex gap-2">
            <Button onClick={finishZone} size="sm" disabled={!currentZone || currentZone.coordinates.length < 3}>
              <Save className="mr-2 h-4 w-4" />
              Terminer la Zone
            </Button>
            <Button onClick={cancelZone} variant="outline" size="sm" className="bg-transparent">
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
          </div>
        )}

        {!isDrawing && zones.length > 0 && (
          <Button onClick={handleSave} size="sm">
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder Tout
          </Button>
        )}
      </div>

      {isDrawing && (
        <div className="rounded-lg border border-primary bg-primary/5 p-3">
          <p className="text-sm text-foreground">
            <MapPin className="inline h-4 w-4 mr-1" />
            Cliquez sur la carte pour ajouter des points à votre zone. Minimum 3 points requis.
            {currentZone && <span className="font-medium ml-1">({currentZone.coordinates.length} points)</span>}
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div
            ref={mapRef}
            onClick={handleMapClick}
            className="relative w-full h-[600px] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden cursor-crosshair"
          >
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-muted-foreground">Chargement de la carte...</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {zones.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Zones Créées ({zones.length})</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {zones.map((zone) => (
              <Card key={zone.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="h-10 w-10 rounded-md shrink-0"
                      style={{ backgroundColor: zone.color + "33", border: `2px solid ${zone.color}` }}
                    />
                    {editingZone?.id === zone.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onBlur={saveEditZone}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditZone()
                          if (e.key === "Escape") setEditingZone(null)
                        }}
                      />
                    ) : (
                      <div className="flex-1">
                        <p className="text-sm font-medium">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">{zone.coordinates.length} points</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={zone.type === "delivery" ? "default" : "destructive"}>
                      {zone.type === "delivery" ? "Livraison" : "Restreinte"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEditZone(zone)}
                      className="h-8 w-8"
                      disabled={editingZone !== null}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteZone(zone.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
