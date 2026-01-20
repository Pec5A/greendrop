"use client"

import { useEffect, useMemo, useState } from "react"
import type { Shop } from "@/lib/types"
import {
  subscribeToShops,
  updateShop as updateShopService,
  createShop as createShopService,
} from "@/lib/firebase/services/shops"
import { logMerchantUpdated } from "@/lib/firebase/services/activity-logs"

export function useMerchants() {
  const [merchants, setMerchants] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToShops(
      (data) => {
        setMerchants(data)
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
    active: merchants.filter((m) => m.status === "active").length,
    pending: merchants.filter((m) => m.status === "pending").length,
    suspended: merchants.filter((m) => m.status === "suspended").length,
    total: merchants.length,
  }), [merchants])

  const updateMerchant = async (id: string, data: Partial<Shop>) => {
    await updateShopService(id, data)
    await logMerchantUpdated(id, data.name ?? "merchant", data)
  }

  const createMerchant = async (
    merchant: Omit<Shop, "id" | "createdAt" | "totalOrders" | "totalProducts">,
  ) => {
    return createShopService(merchant)
  }

  return {
    merchants,
    loading,
    error,
    stats,
    updateMerchant,
    createMerchant,
  }
}
