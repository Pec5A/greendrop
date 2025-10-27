"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import type { User } from "@/lib/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: User["role"][]
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = ["admin", "merchant"],
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Not authenticated
      if (!user) {
        router.push(redirectTo)
        return
      }

      // Authenticated but role not allowed
      if (userProfile && !allowedRoles.includes(userProfile.role)) {
        router.push("/unauthorized")
        return
      }
    }
  }, [user, userProfile, loading, allowedRoles, redirectTo, router])

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user || (userProfile && !allowedRoles.includes(userProfile.role))) {
    return null
  }

  // User is authenticated and has correct role
  return <>{children}</>
}

// Hook to check if user has specific role
export function useRole() {
  const { userProfile } = useAuth()
  
  const hasRole = (role: User["role"] | User["role"][]) => {
    if (!userProfile) return false
    if (Array.isArray(role)) {
      return role.includes(userProfile.role)
    }
    return userProfile.role === role
  }

  const isAdmin = hasRole("admin")
  const isMerchant = hasRole("merchant")
  const isDriver = hasRole("driver")
  const isUser = hasRole("user")

  return {
    role: userProfile?.role,
    hasRole,
    isAdmin,
    isMerchant,
    isDriver,
    isUser,
  }
}
