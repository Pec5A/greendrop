"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/firebase/auth-context"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Accès Refusé</CardTitle>
            <CardDescription className="mt-2">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>
              Cette section est réservée aux administrateurs et marchands uniquement. 
              Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.back()} variant="outline" className="w-full">
              Retour
            </Button>
            <Button onClick={handleLogout} variant="destructive" className="w-full">
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
