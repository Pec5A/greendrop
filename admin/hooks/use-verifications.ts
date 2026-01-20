"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    const unsubscribe = subscribeToVerifications(
      (data) => {
        setVerifications(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
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
