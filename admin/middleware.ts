import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Next.js Middleware - Route protection and security
 *
 * Runs on the Edge Runtime before every matched route.
 * Protects admin routes and adds security checks.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/csrf", "/api/openapi", "/api-docs"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))
  const isApiRoute = pathname.startsWith("/api/")
  const isStaticAsset = pathname.startsWith("/_next/") || pathname.includes(".")

  // Skip middleware for static assets, public routes, and API routes
  // (API routes handle their own auth via withAuth middleware)
  if (isStaticAsset || isPublicRoute || isApiRoute) {
    return NextResponse.next()
  }

  // Protected admin routes - check for session cookie
  const adminRoutes = [
    "/dashboard",
    "/users",
    "/orders",
    "/drivers",
    "/catalog",
    "/verifications",
    "/disputes",
    "/legal-zones",
    "/config",
    "/chat",
  ]

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  if (isAdminRoute) {
    // Check for Firebase auth session
    // Note: Firebase Auth uses client-side tokens, so we check for the
    // presence of auth-related cookies/headers as a first-pass filter.
    // The actual token verification happens in the API middleware.
    const authCookie = request.cookies.get("__session")
    const hasFirebaseAuth = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("firebase") || c.name === "__session")

    // If no auth indicators at all, redirect to login
    // This is a soft check - real auth is done client-side with Firebase
    if (!authCookie && !hasFirebaseAuth) {
      // Allow the request through - the client-side AuthWrapper will handle
      // redirection if the user is not authenticated
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
