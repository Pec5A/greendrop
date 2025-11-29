import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "./firebase-admin"
import { rateLimit } from "./rate-limit"
import crypto from "crypto"

export interface AuthenticatedRequest extends NextRequest {
  userId?: string
  userRole?: "admin" | "supervisor" | "user" | "merchant" | "driver"
}

// CSRF Protection: secret key for token generation
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex")

/**
 * Generate a CSRF token based on session/user ID
 */
export function generateCsrfToken(sessionId: string): string {
  const hmac = crypto.createHmac("sha256", CSRF_SECRET)
  hmac.update(sessionId + ":" + Math.floor(Date.now() / 3600000)) // 1h window
  return hmac.digest("hex")
}

/**
 * Verify a CSRF token
 */
export function verifyCsrfToken(token: string, sessionId: string): boolean {
  const currentHour = Math.floor(Date.now() / 3600000)
  // Check current hour and previous hour to handle window boundary
  for (const hour of [currentHour, currentHour - 1]) {
    const hmac = crypto.createHmac("sha256", CSRF_SECRET)
    hmac.update(sessionId + ":" + hour)
    const expected = hmac.digest("hex")
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true
    }
  }
  return false
}

/**
 * Middleware to validate CSRF token on state-changing requests (POST, PUT, PATCH, DELETE)
 */
export function withCsrfProtection(
  handler: (request: NextRequest, auth: { userId: string; userRole: string }) => Promise<NextResponse>,
  options?: { requiredRole?: "admin" | "supervisor" | "merchant" | "driver" }
) {
  return withAuth(async (request, auth) => {
    const method = request.method.toUpperCase()

    // Only validate CSRF on state-changing methods
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrfToken = request.headers.get("X-CSRF-Token")

      if (!csrfToken || !verifyCsrfToken(csrfToken, auth.userId)) {
        return NextResponse.json({ error: "Forbidden", message: "Token CSRF invalide ou manquant" }, { status: 403 })
      }
    }

    return handler(request, auth)
  }, options)
}

/**
 * Middleware pour vérifier le token Firebase dans le header Authorization
 */
export async function verifyAuth(request: NextRequest): Promise<{
  userId: string
  userRole: "admin" | "supervisor" | "user" | "merchant" | "driver"
} | null> {
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Récupérer le rôle de l'utilisateur depuis Firestore
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()

    if (!userDoc.exists) {
      return null
    }

    const userData = userDoc.data()

    return {
      userId: decodedToken.uid,
      userRole: userData?.role || "user",
    }
  } catch (error: any) {
    console.error("[Auth] Verification failed:", error.code || error.message)
    return null
  }
}

/**
 * Wrapper pour protéger une route avec authentification
 */
export function withAuth(
  handler: (request: NextRequest, auth: { userId: string; userRole: string }) => Promise<NextResponse>,
  options?: {
    requiredRole?: "admin" | "supervisor" | "merchant" | "driver"
    rateLimit?: { limit?: number; windowSec?: number }
  }
) {
  return async (request: NextRequest) => {
    // Rate limiting check
    const rateLimitResponse = rateLimit(request, options?.rateLimit ?? { limit: 60, windowSec: 60 })
    if (rateLimitResponse) return rateLimitResponse

    const auth = await verifyAuth(request)

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Token d'authentification invalide ou manquant" },
        { status: 401 }
      )
    }

    // Vérifier le rôle si requis (admin et supervisor ont accès à tout)
    if (
      options?.requiredRole &&
      auth.userRole !== "admin" &&
      auth.userRole !== "supervisor" &&
      auth.userRole !== options.requiredRole
    ) {
      return NextResponse.json(
        { error: "Forbidden", message: `Accès réservé aux ${options.requiredRole}s` },
        { status: 403 }
      )
    }

    try {
      return await handler(request, auth)
    } catch (error: any) {
      console.error("API error:", error)
      return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 })
    }
  }
}

/**
 * Helper pour gérer les erreurs communes
 */
export function handleApiError(error: any): NextResponse {
  console.error("API Error:", error)

  if (error.code === "permission-denied") {
    return NextResponse.json(
      { error: "Forbidden", message: "Vous n'avez pas la permission d'effectuer cette action" },
      { status: 403 }
    )
  }

  if (error.code === "not-found") {
    return NextResponse.json({ error: "Not Found", message: "Ressource introuvable" }, { status: 404 })
  }

  return NextResponse.json(
    { error: "Internal Server Error", message: error.message || "Une erreur est survenue" },
    { status: 500 }
  )
}
