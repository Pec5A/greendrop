"use client"

import type React from "react"

import { useState } from "react"
import { Leaf, Mail, Lock, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/firebase/auth-context"
import { useRouter } from "next/navigation"

type LoginView = "login" | "forgot" | "reset-sent"

export default function LoginPage() {
  const [view, setView] = useState<LoginView>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  
  const { signIn, signInWithGoogle, resetPassword, error, clearError } = useAuth()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    clearError()
    
    try {
      await signIn(email, password)
      router.push("/dashboard")
    } catch (err) {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    clearError()
    try {
      await signInWithGoogle()
      router.push("/dashboard")
    } catch (err) {
      // Error handled by auth context
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    clearError()
    
    try {
      await resetPassword(email)
      setSuccessMessage("Un email de réinitialisation a été envoyé à votre adresse.")
      setView("reset-sent")
    } catch (err) {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const renderLoginView = () => (
    <>
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Leaf className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">GreenDrop Admin</CardTitle>
          <CardDescription className="mt-2">Connectez-vous pour accéder au tableau de bord</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@greendrop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => {
              clearError()
              setView("forgot")
            }} 
            className="text-sm text-primary hover:underline"
          >
            Mot de passe oublié?
          </button>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continuer avec Google
          </Button>
        </form>
      </CardContent>
    </>
  )

  const renderForgotView = () => (
    <>
      <CardHeader className="space-y-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            clearError()
            setView("login")
          }} 
          className="self-start"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <CardTitle className="text-2xl font-bold">Mot de passe oublié</CardTitle>
          <CardDescription className="mt-2">Entrez votre email pour recevoir un lien de réinitialisation</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                placeholder="admin@greendrop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Envoyer le lien"
            )}
          </Button>
        </form>
      </CardContent>
    </>
  )

  const renderResetSentView = () => (
    <>
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Email envoyé!</CardTitle>
          <CardDescription className="mt-2">{successMessage}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
        </p>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => {
            clearError()
            setView("login")
          }}
        >
          Retour à la connexion
        </Button>
      </CardContent>
    </>
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4" role="main" aria-label="Page de connexion">
      <Card className="w-full max-w-md" role="region" aria-label="Formulaire de connexion">
        {view === "login" && renderLoginView()}
        {view === "forgot" && renderForgotView()}
        {view === "reset-sent" && renderResetSentView()}
      </Card>
    </main>
  )
}