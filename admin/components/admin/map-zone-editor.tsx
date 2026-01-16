"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Plus, Trash2, Save, X } from "lucide-react"

interface Coordinate {
  x: number
  y: number
}

interface MapZoneEditorProps {
  initialZones?: Zone[]
  onSave?: (zones: Zone[]) => void
}

interface Zone {
  id: string
  name: string
  type: "delivery" | "restricted"
  coordinates: Coordinate[]
  color: string
}

export function MapZoneEditor({ initialZones = [], onSave }: MapZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [currentZone, setCurrentZone] = useState<Zone | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const colors = {
    delivery: "#10b981",
    restricted: "#ef4444",
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw map background (simplified grid)
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    // Draw existing zones
    zones.forEach((zone) => {
      if (zone.coordinates.length < 2) return

      ctx.beginPath()
      ctx.moveTo(zone.coordinates[0].x, zone.coordinates[0].y)
      zone.coordinates.forEach(({ x, y }) => {
        ctx.lineTo(x, y)
      })
      ctx.closePath()

      // Fill zone with semi-transparent color
      ctx.fillStyle = zone.color + "33"
      ctx.fill()

      // Draw border
      ctx.strokeStyle = zone.color
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw points
      zone.coordinates.forEach(({ x, y }) => {
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fillStyle = zone.color
        ctx.fill()
      })
    })

    // Draw current zone being created
    if (currentZone && currentZone.coordinates.length > 0) {
      ctx.beginPath()
      ctx.moveTo(currentZone.coordinates[0].x, currentZone.coordinates[0].y)
      currentZone.coordinates.forEach(({ x, y }) => {
        ctx.lineTo(x, y)
      })

      if (currentZone.coordinates.length > 2) {
        ctx.closePath()
        ctx.fillStyle = currentZone.color + "33"
        ctx.fill()
      }

      ctx.strokeStyle = currentZone.color
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw points
      currentZone.coordinates.forEach(({ x, y }) => {
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fillStyle = currentZone.color
        ctx.fill()
      })
    }
  }, [zones, currentZone])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentZone) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentZone({
      ...currentZone,
      coordinates: [...currentZone.coordinates, { x, y }],
    })
  }

  const startNewZone = (type: "delivery" | "restricted") => {
    setCurrentZone({
      id: `zone-${Date.now()}`,
      name: `${type === "delivery" ? "Delivery" : "Restricted"} Zone ${zones.length + 1}`,
      type,
      coordinates: [],
      color: colors[type],
    })
    setIsDrawing(true)
  }

  const finishZone = () => {
    if (currentZone && currentZone.coordinates.length >= 3) {
      setZones([...zones, currentZone])
      setCurrentZone(null)
      setIsDrawing(false)
    }
  }

  const cancelZone = () => {
    setCurrentZone(null)
    setIsDrawing(false)
  }

  const deleteZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id))
  }

  const handleSave = () => {
    if (onSave) {
      onSave(zones)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => startNewZone("delivery")} disabled={isDrawing} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Delivery Zone
          </Button>
          <Button onClick={() => startNewZone("restricted")} disabled={isDrawing} variant="destructive" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Restricted Zone
          </Button>
        </div>

        {isDrawing && (
          <div className="flex gap-2">
            <Button onClick={finishZone} size="sm" disabled={!currentZone || currentZone.coordinates.length < 3}>
              <Save className="mr-2 h-4 w-4" />
              Finish Zone
            </Button>
            <Button onClick={cancelZone} variant="outline" size="sm" className="bg-transparent">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}

        {!isDrawing && zones.length > 0 && (
          <Button onClick={handleSave} size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save All Zones
          </Button>
        )}
      </div>

      {isDrawing && (
        <div className="rounded-lg border border-primary bg-primary/5 p-3">
          <p className="text-sm text-foreground">
            <MapPin className="inline h-4 w-4 mr-1" />
            Click on the map to add points to your zone. Minimum 3 points required.
            {currentZone && <span className="font-medium ml-1">({currentZone.coordinates.length} points)</span>}
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            onClick={handleCanvasClick}
            className="w-full border border-border rounded-lg cursor-crosshair bg-background"
          />
        </CardContent>
      </Card>

      {zones.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Created Zones ({zones.length})</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {zones.map((zone) => (
              <Card key={zone.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-md"
                      style={{ backgroundColor: zone.color + "33", border: `2px solid ${zone.color}` }}
                    />
                    <div>
                      <p className="text-sm font-medium">{zone.name}</p>
                      <p className="text-xs text-muted-foreground">{zone.coordinates.length} points</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={zone.type === "delivery" ? "default" : "destructive"}>{zone.type}</Badge>
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
