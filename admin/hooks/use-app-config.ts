"use client"

import { useEffect, useState } from "react"
import {
  subscribeToConfig,
  updatePlatformSettings as updatePlatformSettingsService,
  updateDeliverySettings as updateDeliverySettingsService,
  updatePaymentSettings as updatePaymentSettingsService,
  updateFeatureFlags as updateFeatureFlagsService,
  toggleFeatureFlag as toggleFeatureFlagService,
  type AppConfig,
  type PlatformSettings,
  type DeliverySettings,
  type PaymentSettings,
  type FeatureFlag,
} from "@/lib/firebase/services/config"

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToConfig(
      (data) => {
        setConfig(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const updatePlatformSettings = async (settings: Partial<PlatformSettings>) => {
    try {
      await updatePlatformSettingsService(settings)
    } catch (err) {
      throw err
    }
  }

  const updateDeliverySettings = async (settings: Partial<DeliverySettings>) => {
    try {
      await updateDeliverySettingsService(settings)
    } catch (err) {
      throw err
    }
  }

  const updatePaymentSettings = async (settings: Partial<PaymentSettings>) => {
    try {
      await updatePaymentSettingsService(settings)
    } catch (err) {
      throw err
    }
  }

  const updateFeatureFlags = async (flags: FeatureFlag[]) => {
    try {
      await updateFeatureFlagsService(flags)
    } catch (err) {
      throw err
    }
  }

  const toggleFeatureFlag = async (flagId: string) => {
    try {
      await toggleFeatureFlagService(flagId)
    } catch (err) {
      throw err
    }
  }

  return {
    config,
    loading,
    error,
    updatePlatformSettings,
    updateDeliverySettings,
    updatePaymentSettings,
    updateFeatureFlags,
    toggleFeatureFlag,
  }
}
