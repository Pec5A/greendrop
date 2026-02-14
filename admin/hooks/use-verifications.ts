"use client"

import { useEffect, useRef, useState } from "react"
import type { Verification } from "@/lib/types"
import {
  subscribeToVerifications,
  createVerification as createVerificationService,
  updateVerification as updateVerificationService,
  approveVerification as approveVerificationService,
  rejectVerification as rejectVerificationService,
  deleteVerification as deleteVerificationService,
  getVerificationStats,
} from "@/lib/firebase/services/verifications"
import {
  logVerificationApproved,
  logVerificationRejected,
} from "@/lib/firebase/services/activity-logs"
import { useAuth } from "@/lib/firebase/auth-context"
import { getDownloadURL, ref as storageRef } from "firebase/storage"
import { storage } from "@/lib/firebase/config"

export function useVerifications() {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const { user } = useAuth()
  const urlCacheRef = useRef<Map<string, string>>(new Map())

  const resolveStorageUrl = async (url: string): Promise<string> => {
    if (!url.startsWith("gs://")) return url

    const cached = urlCacheRef.current.get(url)
    if (cached) return cached

    const downloadUrl = await getDownloadURL(storageRef(storage, url))
    urlCacheRef.current.set(url, downloadUrl)
    return downloadUrl
  }

  const resolveVerificationMedia = async (items: Verification[]): Promise<Verification[]> => {
    return Promise.all(
      items.map(async (item) => {
        const documentUrl = item.documentUrl
          ? await resolveStorageUrl(item.documentUrl)
          : item.documentUrl

        const attachments = item.attachments
          ? await Promise.all(
              item.attachments.map(async (att) => ({
                ...att,
                url: await resolveStorageUrl(att.url),
              }))
            )
          : item.attachments

        return { ...item, documentUrl, attachments }
      })
    )
  }

  useEffect(() => {
    let active = true

    const unsubscribe = subscribeToVerifications(
      async (data) => {
        try {
          const resolved = await resolveVerificationMedia(data)
          if (active) {
            setVerifications(resolved)
            setLoading(false)
          }
        } catch {
          if (active) {
            setVerifications(data)
            setLoading(false)
          }
        }
      },
      (err) => {
        if (active) {
          setError(err)
          setLoading(false)
        }
      }
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // Update stats when verifications change
  useEffect(() => {
    const newStats = {
      total: verifications.length,
      pending: verifications.filter((v) => v.status === "pending").length,
      approved: verifications.filter((v) => v.status === "approved").length,
      rejected: verifications.filter((v) => v.status === "rejected").length,
    }
    setStats(newStats)
  }, [verifications])

  const createVerification = async (
    verificationData: Omit<Verification, "id" | "submittedAt">
  ) => {
    try {
      const id = await createVerificationService(verificationData)
      return id
    } catch (err) {
      throw err
    }
  }

  const updateVerification = async (id: string, verificationData: Partial<Verification>) => {
    try {
      await updateVerificationService(id, verificationData)
    } catch (err) {
      throw err
    }
  }

  const approveVerification = async (id: string) => {
    try {
      const reviewerEmail = user?.email || "admin@greendrop.com"
      await approveVerificationService(id, reviewerEmail)

      const verification = verifications.find((v) => v.id === id)
      if (verification) {
        await logVerificationApproved(id, verification.userId, reviewerEmail)
      }
    } catch (err) {
      throw err
    }
  }

  const rejectVerification = async (id: string, reason?: string) => {
    try {
      const reviewerEmail = user?.email || "admin@greendrop.com"
      await rejectVerificationService(id, reviewerEmail, reason)

      const verification = verifications.find((v) => v.id === id)
      if (verification) {
        await logVerificationRejected(id, verification.userId, reviewerEmail, reason)
      }
    } catch (err) {
      throw err
    }
  }

  const deleteVerification = async (id: string) => {
    try {
      await deleteVerificationService(id)
    } catch (err) {
      throw err
    }
  }

  return {
    verifications,
    loading,
    error,
    stats,
    createVerification,
    updateVerification,
    approveVerification,
    rejectVerification,
    deleteVerification,
  }
}
