"use client"

import { useEffect, useState } from "react"
import type { Dispute } from "@/lib/types"
import {
  subscribeToDisputes,
  createDispute as createDisputeService,
  updateDispute as updateDisputeService,
  updateDisputeStatus as updateDisputeStatusService,
  resolveDispute as resolveDisputeService,
  closeDispute as closeDisputeService,
  deleteDispute as deleteDisputeService,
} from "@/lib/firebase/services/disputes"
import { logDisputeResolved } from "@/lib/firebase/services/activity-logs"
import { useAuth } from "@/lib/firebase/auth-context"

export function useDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    investigating: 0,
    resolved: 0,
    closed: 0,
    totalAmount: 0,
    highPriority: 0,
  })
  const { user } = useAuth()

  useEffect(() => {
    const unsubscribe = subscribeToDisputes(
      (data) => {
        setDisputes(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Update stats when disputes change
  useEffect(() => {
    const newStats = {
      total: disputes.length,
      open: disputes.filter((d) => d.status === "open").length,
      investigating: disputes.filter((d) => d.status === "investigating").length,
      resolved: disputes.filter((d) => d.status === "resolved").length,
      closed: disputes.filter((d) => d.status === "closed").length,
      totalAmount: disputes.reduce((sum, d) => sum + d.amount, 0),
      highPriority: disputes.filter(
        (d) => d.priority === "high" && d.status !== "resolved" && d.status !== "closed"
      ).length,
    }
    setStats(newStats)
  }, [disputes])

  const createDispute = async (
    disputeData: Omit<Dispute, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const id = await createDisputeService(disputeData)
      return id
    } catch (err) {
      throw err
    }
  }

  const updateDispute = async (id: string, disputeData: Partial<Dispute>) => {
    try {
      await updateDisputeService(id, disputeData)
    } catch (err) {
      throw err
    }
  }

  const updateDisputeStatus = async (id: string, status: Dispute["status"]) => {
    try {
      await updateDisputeStatusService(id, status)
    } catch (err) {
      throw err
    }
  }

  const resolveDispute = async (id: string, resolution: string) => {
    try {
      const resolverEmail = user?.email || "admin@greendrop.com"
      await resolveDisputeService(id, resolution, resolverEmail)
      await logDisputeResolved(id, resolverEmail, resolution)
    } catch (err) {
      throw err
    }
  }

  const closeDispute = async (id: string) => {
    try {
      await closeDisputeService(id)
    } catch (err) {
      throw err
    }
  }

  const deleteDispute = async (id: string) => {
    try {
      await deleteDisputeService(id)
    } catch (err) {
      throw err
    }
  }

  return {
    disputes,
    loading,
    error,
    stats,
    createDispute,
    updateDispute,
    updateDisputeStatus,
    resolveDispute,
    closeDispute,
    deleteDispute,
  }
}
