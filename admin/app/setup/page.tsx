"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Database, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { seedDatabase } from "@/lib/firebase/seed"
import { initializeConfig } from "@/lib/firebase/services/config"
import { useAuth } from "@/lib/firebase/auth-context"

export default function SetupPage() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; error?: any } | null>(null)
  const { userProfile } = useAuth()

  const handleSeedDatabase = async () => {
    if (!confirm("Êtes-vous sûr de vouloir peupler la base de données avec les données de démonstration? Cette action ajoutera des données.")) {
      return
    }

    setIsSeeding(true)
    setSeedResult(null)

    try {
      const result = await seedDatabase()
      setSeedResult(result)
    } catch (error) {
      setSeedResult({ success: false, error })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleInitConfig = async () => {
    try {
      await initializeConfig()
      alert("Configuration initialisée avec succès!")
    } catch (error) {
      alert("Erreur lors de l'initialisation de la configuration")
      console.error(error)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration Firebase</h1>
          <p className="text-muted-foreground mt-1">Gérer la base de données et les paramètres Firebase</p>
        </div>

        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Utilisateur connecté
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{userProfile?.name || "Inconnu"}</p>
                <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
              </div>
              <Badge variant={userProfile?.role === "admin" ? "default" : "secondary"}>
                {userProfile?.role || "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Seed Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Peupler la base de données
            </CardTitle>
            <CardDescription>
              Ajouter des données de démonstration à votre base de données Firebase. 
              Utilisez cette fonction uniquement pour le développement ou les tests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Attention</AlertTitle>
              <AlertDescription>
                Cette action ajoutera des données à votre base de données. 
                Utilisez-la uniquement dans un environnement de développement.
              </AlertDescription>
            </Alert>

            {seedResult && (
              <Alert variant={seedResult.success ? "default" : "destructive"}>
                {seedResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {seedResult.success ? "Succès!" : "Erreur"}
                </AlertTitle>
                <AlertDescription>
                  {seedResult.success 
                    ? "Les données de démonstration ont été ajoutées avec succès."
                    : `Une erreur s'est produite: ${seedResult.error?.message || "Erreur inconnue"}`
                  }
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleSeedDatabase} 
                disabled={isSeeding}
                variant="destructive"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Peuplement en cours...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Peupler la base de données
                  </>
                )}
              </Button>

              <Button 
                onClick={handleInitConfig}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Initialiser la configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Firebase Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions de configuration</CardTitle>
            <CardDescription>
              Suivez ces étapes pour configurer Firebase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline">1</Badge>
                <div>
                  <p className="font-medium">Créer un projet Firebase</p>
                  <p className="text-sm text-muted-foreground">
                    Allez sur <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.firebase.google.com</a> et créez un nouveau projet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline">2</Badge>
                <div>
                  <p className="font-medium">Activer Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Dans Firebase Console, activez Authentication {">"} Sign-in method {">"} Email/Password
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline">3</Badge>
                <div>
                  <p className="font-medium">Créer une base Firestore</p>
                  <p className="text-sm text-muted-foreground">
                    Créez une base de données Firestore en mode test ou production.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline">4</Badge>
                <div>
                  <p className="font-medium">Configurer les variables d'environnement</p>
                  <p className="text-sm text-muted-foreground">
                    Copiez les credentials depuis Firebase Console {">"} Project Settings {">"} Your apps, puis créez un fichier <code className="bg-muted px-1 rounded">.env.local</code> basé sur <code className="bg-muted px-1 rounded">.env.example</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline">5</Badge>
                <div>
                  <p className="font-medium">Créer un utilisateur admin</p>
                  <p className="text-sm text-muted-foreground">
                    Dans Firebase Console {">"} Authentication {">"} Users, créez un utilisateur avec email/password.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline">6</Badge>
                <div>
                  <p className="font-medium">Peupler la base de données</p>
                  <p className="text-sm text-muted-foreground">
                    Utilisez le bouton ci-dessus pour ajouter des données de démonstration.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Firestore Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Règles Firestore recommandées</CardTitle>
            <CardDescription>
              Copiez ces règles dans Firebase Console {">"} Firestore {">"} Rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update, delete: if isAdmin();
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // Verifications collection
    match /verifications/{verificationId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // Disputes collection
    match /disputes/{disputeId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // Legal zones collection
    match /legalZones/{zoneId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // Config collection
    match /config/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Activity logs collection
    match /activityLogs/{logId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
