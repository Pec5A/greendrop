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
  
  const { signIn, resetPassword, error, clearError } = useAuth()
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