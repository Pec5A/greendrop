"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

function getOrCreateSessionId(): string {
  const cookieName = "gd_sid"
  const existing = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${cookieName}=`))
    ?.split("=")[1]

  if (existing) {
    // Refresh expiry
    document.cookie = `${cookieName}=${existing}; path=/; max-age=1800; SameSite=Lax`
    return existing
  }

  const id = crypto.randomUUID()
  document.cookie = `${cookieName}=${id}; path=/; max-age=1800; SameSite=Lax`
  return id
}

export function usePageAnalytics() {
  const pathname = usePathname()
  const lastPath = useRef<string>("")

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return
    lastPath.current = pathname

    const sessionId = getOrCreateSessionId()

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer,
        sessionId,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      }),
    }).catch(() => {
      // Fire-and-forget: silently ignore errors
    })
  }, [pathname])
}
