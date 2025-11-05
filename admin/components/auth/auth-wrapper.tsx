"use client"

import { AuthProvider } from "@/lib/firebase/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <AuthProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AuthProvider>
  )
}
