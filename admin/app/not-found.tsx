import { FileQuestion, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-bold">Page introuvable</h2>
        <p className="text-muted-foreground max-w-md">
          La page que vous recherchez n&apos;existe pas ou a ete deplacee.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" />
          Accueil
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </div>
  )
}
