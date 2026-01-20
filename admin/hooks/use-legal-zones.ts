"use client"

import { useEffect, useState } from "react"
import {
  subscribeToLegalZones,
  createLegalZone as createLegalZoneService,
  updateLegalZone as updateLegalZoneService,
  toggleLegalZoneActive as toggleLegalZoneActiveService,
  deleteLegalZone as deleteLegalZoneService,
  saveAllLegalZones as saveAllLegalZonesService,
  type LegalZoneExtended,
} from "@/lib/firebase/services/legal-zones"

export function useLegalZones() {
  const [zones, setZones] = useState<LegalZoneExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    delivery: 0,
    restricted: 0,
    active: 0,
    inactive: 0,
  })

  useEffect(() => {
    const unsubscribe = subscribeToLegalZones(
      (data) => {
        setZones(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Update stats when zones change
  useEffect(() => {
    const newStats = {
      total: zones.length,
      delivery: zones.filter((z) => z.type === "delivery").length,
      restricted: zones.filter((z) => z.type === "restricted").length,
      active: zones.filter((z) => z.active).length,
      inactive: zones.filter((z) => !z.active).length,
    }
    setStats(newStats)
  }, [zones])

  const createLegalZone = async (zoneData: Omit<LegalZoneExtended, "id">) => {
    try {
      const id = await createLegalZoneService(zoneData)
      return id
    } catch (err) {
      throw err
    }
  }

  const updateLegalZone = async (id: string, zoneData: Partial<LegalZoneExtended>) => {
    try {
      await updateLegalZoneService(id, zoneData)
    } catch (err) {
      throw err
    }
  }

  const toggleLegalZoneActive = async (id: string, active: boolean, zoneName?: string) => {
    try {
      await toggleLegalZoneActiveService(id, active, zoneName)
    } catch (err) {
      throw err
    }
  }

  const deleteLegalZone = async (id: string, zoneName?: string) => {
    try {
      await deleteLegalZoneService(id, zoneName)
    } catch (err) {
      throw err
    }
  }

  const saveAllZones = async (newZones: LegalZoneExtended[]) => {
    try {
      await saveAllLegalZonesService(newZones)
    } catch (err) {
      throw err
    }
  }

  return {
    zones,
    loading,
    error,
    stats,
    createLegalZone,
    updateLegalZone,
    toggleLegalZoneActive,
    deleteLegalZone,
    saveAllZones,
  }
}
