"use client"

import { useEffect, useState } from "react"
import type { User } from "@/lib/types"
import {
  subscribeToUsers,
  createUser as createUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  deleteUsers as deleteUsersService,
  updateUserStatus as updateUserStatusService,
} from "@/lib/firebase/services/users"
import { logUserCreated, logUserUpdated, logUserDeleted } from "@/lib/firebase/services/activity-logs"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToUsers(
      (data) => {
        setUsers(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const createUser = async (userData: Omit<User, "id" | "createdAt">) => {
    try {
      const id = await createUserService(userData)
      await logUserCreated(id, userData.name)
      return id
    } catch (err) {
      throw err
    }
  }

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      await updateUserService(id, userData)
      const user = users.find((u) => u.id === id)
      if (user) {
        await logUserUpdated(id, user.name, userData)
      }
    } catch (err) {
      throw err
    }
  }

  const updateUserStatus = async (id: string, status: User["status"]) => {
    try {
      await updateUserStatusService(id, status)
      const user = users.find((u) => u.id === id)
      if (user) {
        await logUserUpdated(id, user.name, { status })
      }
    } catch (err) {
      throw err
    }
  }

  const deleteUser = async (id: string) => {
    try {
      const user = users.find((u) => u.id === id)
      await deleteUserService(id)
      if (user) {
        await logUserDeleted(id, user.name)
      }
    } catch (err) {
      throw err
    }
  }

  const deleteUsers = async (ids: string[]) => {
    try {
      for (const id of ids) {
        const user = users.find((u) => u.id === id)
        if (user) {
          await logUserDeleted(id, user.name)
        }
      }
      await deleteUsersService(ids)
    } catch (err) {
      throw err
    }
  }

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
    deleteUsers,
  }
}
