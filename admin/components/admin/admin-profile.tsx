"use client"

import { useState } from "react"
import { User, LogOut, Shield, Bell, KeyRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/firebase/auth-context"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export function AdminProfile() {
  const { user, userProfile, signOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    twoFactorEnabled: false,
  })

  // Initialize form data when profile opens
  const handleOpenProfile = () => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || "",
        email: userProfile.email || "",
      })
    }
    setProfileOpen(true)
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleDisplay = (role: string | undefined) => {
    if (!role) return "User"
    return role === "admin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1)
  }

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return
    
    setSaving(true)
    try {
      const userRef = doc(db, COLLECTIONS.USERS, user.uid)
      await updateDoc(userRef, {
        name: formData.name,
        updatedAt: new Date().toISOString(),
      })
      
      toast.success("Profil mis à jour avec succès !")
      setProfileOpen(false)
      
      // Refresh page to update profile
      setTimeout(() => window.location.reload(), 1000)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error("Erreur lors de la mise à jour : " + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user) return
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    
    setSaving(true)
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        user.email!,
        passwordData.currentPassword
      )
      await reauthenticateWithCredential(user, credential)
      
      // Update password
      await updatePassword(user, passwordData.newPassword)
      
      toast.success("Mot de passe modifié avec succès !")
      setPasswordDialogOpen(false)
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("Error changing password:", error)
      if (error.code === "auth/wrong-password") {
        toast.error("Mot de passe actuel incorrect")
      } else {
        toast.error("Erreur : " + error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success("Déconnexion réussie")
    } catch (error: any) {
      console.error("Error logging out:", error)
      toast.error("Erreur lors de la déconnexion")
    }
  }

  if (!userProfile) return null

  if (!userProfile) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg hover:bg-accent p-1.5 transition-colors">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials(userProfile.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userProfile.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
              <Badge variant="default" className="w-fit mt-1.5 text-[10px] px-1.5 py-0">
                {getRoleDisplay(userProfile.role)}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenProfile}>
            <User className="mr-2 h-4 w-4" />
            Paramètres du profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Changer le mot de passe
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenProfile}>
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paramètres du profil</DialogTitle>
            <DialogDescription>Gérez les paramètres de votre compte administrateur</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations du profil
              </h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Input 
                    id="role" 
                    value={getRoleDisplay(userProfile.role)} 
                    disabled 
                    className="bg-muted" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Paramètres de sécurité
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Authentification à deux facteurs</Label>
                    <p className="text-xs text-muted-foreground">Ajoutez une couche de sécurité supplémentaire</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, twoFactorEnabled: checked })
                      toast.info("Fonctionnalité en développement")
                    }}
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="w-full bg-transparent"
                  onClick={() => {
                    setProfileOpen(false)
                    setPasswordDialogOpen(true)
                  }}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Changer le mot de passe
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Préférences de notification
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Notifications par email</Label>
                    <p className="text-xs text-muted-foreground">Recevoir des mises à jour par email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, emailNotifications: checked })
                      toast.success(checked ? "Notifications email activées" : "Notifications email désactivées")
                    }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Notifications push</Label>
                    <p className="text-xs text-muted-foreground">Recevoir des alertes en temps réel</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => {
                      setSettings({ ...settings, pushNotifications: checked })
                      toast.success(checked ? "Notifications push activées" : "Notifications push désactivées")
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setProfileOpen(false)} className="bg-transparent">
              Annuler
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>Entrez votre mot de passe actuel et votre nouveau mot de passe</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input 
                id="currentPassword" 
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input 
                id="newPassword" 
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Au moins 6 caractères</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input 
                id="confirmPassword" 
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setPasswordDialogOpen(false)
                setPasswordData({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                })
              }} 
              className="bg-transparent"
            >
              Annuler
            </Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? "Modification..." : "Modifier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
