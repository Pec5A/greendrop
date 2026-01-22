"use client"

import { useState, useEffect } from "react"
import { ref, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase/config"
import { Loader2, ImageOff } from "lucide-react"

interface StorageImageProps {
  src: string
  alt: string
  className?: string
}

/**
 * Extracts the Firebase Storage path from a download URL.
 * URLs look like: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
 */
function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const match = urlObj.pathname.match(/\/o\/(.+)$/)
    if (match) {
      return decodeURIComponent(match[1])
    }
  } catch {
    // Not a valid URL
  }
  return null
}

export function StorageImage({ src, alt, className }: StorageImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      const path = extractStoragePath(src)
      if (!path) {
        // Can't extract path — fall back to original URL
        if (!cancelled) {
          setResolvedUrl(src)
          setLoading(false)
        }
        return
      }

      try {
        const freshUrl = await getDownloadURL(ref(storage, path))
        if (!cancelled) {
          setResolvedUrl(freshUrl)
          setLoading(false)
        }
      } catch {
        // SDK call failed — fall back to original URL
        if (!cancelled) {
          setResolvedUrl(src)
          setLoading(false)
        }
      }
    }

    setLoading(true)
    setError(false)
    setResolvedUrl(null)
    resolve()

    return () => {
      cancelled = true
    }
  }, [src])

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-muted ${className ?? ""}`}>
        <ImageOff className="h-6 w-6 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Failed to load image</span>
      </div>
    )
  }

  return <img src={resolvedUrl ?? src} alt={alt} className={className} onError={() => setError(true)} />
}
