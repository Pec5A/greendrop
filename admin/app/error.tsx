"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Une erreur est survenue</h2>
        <p className="text-muted-foreground max-w-md">
          Nous nous excusons pour la gene occasionnee. Veuillez reessayer ou retourner a l&apos;accueil.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground font-mono">Code erreur : {error.digest}</p>}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Home className="h-4 w-4" />
          Accueil
        </Link>
      </div>
    </div>
  )
}
