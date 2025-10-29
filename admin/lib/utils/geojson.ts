import type { LegalZone } from "@/lib/types"

interface GeoJSONGeometry {
  type: "Polygon"
  coordinates: number[][][]
}

interface GeoJSONFeature {
  type: "Feature"
  properties: {
    id?: string
    name?: string
    type?: LegalZone["type"]
    color?: string
    active?: boolean
  }
  geometry: GeoJSONGeometry
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection"
  features: GeoJSONFeature[]
}

const colors: Record<LegalZone["type"], string> = {
  delivery: "#10b981",
  restricted: "#ef4444",
}

const ensureClosedRing = (points: number[][]): number[][] => {
  if (points.length === 0) return points
  const [firstX, firstY] = points[0]
  const [lastX, lastY] = points[points.length - 1]
  if (firstX === lastX && firstY === lastY) {
    return points
  }
  return [...points, [firstX, firstY]]
}

export const legalZonesToGeoJSON = (zones: LegalZone[]): GeoJSONFeatureCollection => {
  const features: GeoJSONFeature[] = zones.map((zone) => {
    const polygon = zone.coordinates.map((coord) => [coord.x, coord.y])
    const coordinates = [ensureClosedRing(polygon)]

    return {
      type: "Feature",
      properties: {
        id: zone.id,
        name: zone.name,
        type: zone.type,
        color: zone.color,
        active: zone.active,
      },
      geometry: {
        type: "Polygon",
        coordinates,
      },
    }
  })

  return {
    type: "FeatureCollection",
    features,
  }
}

const randomId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `zone-${Math.random().toString(36).slice(2, 10)}`
}

export const geoJSONToLegalZones = (collection: GeoJSONFeatureCollection): LegalZone[] => {
  if (!collection || collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return []
  }

  return (collection.features
    .map((feature) => {
      if (
        !feature ||
        feature.type !== "Feature" ||
        !feature.geometry ||
        feature.geometry.type !== "Polygon" ||
        !Array.isArray(feature.geometry.coordinates)
      ) {
        return null
      }

      const ring = feature.geometry.coordinates[0] || []
      const coordinates = ring
        .slice(0, ring.length === 0 ? 0 : ring.length - 1)
        .map(([x, y]) => ({ x: Number(x) || 0, y: Number(y) || 0 }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

      if (coordinates.length < 3) {
        return null
      }

      const type = (feature.properties?.type as LegalZone["type"]) || "delivery"

      return {
        id: feature.properties?.id || randomId(),
        name: feature.properties?.name || `Imported ${type} zone`,
        type,
        color: feature.properties?.color || colors[type],
        active: feature.properties?.active ?? true,
        coordinates,
      }
    })
    .filter((zone) => zone !== null)) as LegalZone[]
}
