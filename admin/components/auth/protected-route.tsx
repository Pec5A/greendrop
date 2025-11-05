"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const publicRoutes = ["/login", "/forgot-password", "/reset-password"]

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, userProfile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const allowSetup = process.env.NEXT_PUBLIC_ALLOW_SETUP === "true"

  const isPublicRoute =
    publicRoutes.some((route) => pathname.startsWith(route)) || (allowSetup && pathname.startsWith("/setup"))

  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute) {
        // Not logged in and trying to access protected route
        router.push("/login")
      } else if (user && isPublicRoute) {
        // Already logged in and trying to access public route
        router.push("/dashboard")
      } else if (
        user &&
        userProfile &&
        !["admin", "supervisor", "merchant"].includes(userProfile.role) &&
        !isPublicRoute
      ) {
        // User is not an admin or merchant
        router.push("/unauthorized")
      }
    }
  }, [user, loading, isPublicRoute, router, userProfile])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Don't render protected content if not authenticated
  if (!user && !isPublicRoute) {
    return null
  }

  // Don't render public routes if authenticated
  if (user && isPublicRoute) {
    return null
  }

  return <>{children}</>
}
