"use client"

import { useEffect, useMemo, useState } from "react"
import type { Driver, DriverLocation, DriverStatus } from "@/lib/types"
import {
  subscribeToDrivers,
  updateDriverStatus as updateDriverStatusService,
  updateDriverLocation as updateDriverLocationService,
  releaseDriver as releaseDriverService,
} from "@/lib/firebase/services/drivers"
import { logDriverStatusChanged } from "@/lib/firebase/services/activity-logs"

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToDrivers(
      (data) => {
        setDrivers(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return () => unsubscribe()
  }, [])

  const stats = useMemo(() => ({
    online: drivers.filter((d) => d.status === "online" || d.status === "busy").length,
    offline: drivers.filter((d) => d.status === "offline").length,
    busy: drivers.filter((d) => d.status === "busy").length,
    activeDeliveries: drivers.filter((d) => d.currentOrderId).length,
    averageRating:
      drivers.length === 0
        ? 0
        : Number(
            (
              drivers.reduce((sum, driver) => sum + (driver.rating ?? 4.5), 0) /
              drivers.length
            ).toFixed(1),
          ),
  }), [drivers])

  const updateDriverStatus = async (id: string, status: DriverStatus, driverName: string) => {
    await updateDriverStatusService(id, status)
    await logDriverStatusChanged(id, driverName, status)
  }

  const updateDriverLocation = async (id: string, location: DriverLocation) => {
    await updateDriverLocationService(id, location)
  }

  const releaseDriver = async (id: string) => {
    await releaseDriverService(id)
  }

  return {
    drivers,
    loading,
    error,
    stats,
    updateDriverStatus,
    updateDriverLocation,
    releaseDriver,
  }
}
