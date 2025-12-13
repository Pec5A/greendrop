"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { DataTable } from "@/components/admin/data-table"
import { EntityModal } from "@/components/admin/entity-modal"
import { UserDetail } from "@/components/admin/user-detail"
import { BulkActionsBar } from "@/components/admin/bulk-actions-bar"
import { SendMessageModal, ResetPasswordModal, SuspendAccountModal } from "@/components/admin/action-modals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, MoreHorizontal, UserPlus, Download } from "lucide-react"
import { exportToCSV } from "@/lib/utils/export"
import type { User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { useUsers } from "@/hooks/use-users"

type UserFormValues = Pick<User, "name" | "email" | "phone" | "role" | "status">

export default function UsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()
  const { t } = useLanguage()

  const [sendMessageUser, setSendMessageUser] = useState<User | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [suspendAccountUser, setSuspendAccountUser] = useState<User | null>(null)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserData, setNewUserData] = useState<{
    name: string
    email: string
    phone: string
    role: User["role"]
  }>({
    name: "",
    email: "",
    phone: "",
    role: "user",
  })

  const { users, loading, error, createUser, deleteUsers, deleteUser, updateUser, updateUserStatus } = useUsers()
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  const activeUser = useMemo(() => users.find((u) => u.id === selectedUserId) || null, [users, selectedUserId])

  useEffect(() => {
    setSelectedUsers((prev) => {
      const next = new Set(Array.from(prev).filter((id) => users.some((user) => user.id === id)))
      return next
    })
  }, [users])

  useEffect(() => {
    if (selectedUserId && !users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(null)
    }
  }, [selectedUserId, users])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return users.filter((user) => {
      if (normalizedQuery) {
        const haystack = `${user.name} ${user.email} ${user.phone || ""}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) return false
      }
      if (statusFilter !== "all" && user.status !== statusFilter) return false
      if (roleFilter !== "all" && user.role !== roleFilter) return false
      return true
    })
  }, [users, statusFilter, roleFilter, searchQuery])

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const toggleAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  const handleBulkExport = () => {
    const selectedData = users.filter((u) => selectedUsers.has(u.id))
    exportToCSV(selectedData, "users")
    toast({
      title: t("language") === "fr" ? "Export réussi" : "Export successful",
      description:
        t("language") === "fr"
          ? `${selectedData.length} utilisateurs exportés en CSV`
          : `Exported ${selectedData.length} users to CSV`,
    })
  }

  const handleBulkSendMessage = () => {
    toast({
      title: t("language") === "fr" ? "Messages mis en file d'attente" : "Messages queued",
      description:
        t("language") === "fr"
          ? `Envoi de message à ${selectedUsers.size} utilisateurs`
          : `Sending message to ${selectedUsers.size} users`,
    })
    setSelectedUsers(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return

    try {
      await deleteUsers(Array.from(selectedUsers))
      toast({
        title: t("language") === "fr" ? "Utilisateurs supprimés" : "Users deleted",
        description:
          t("language") === "fr"
            ? `${selectedUsers.size} utilisateurs supprimés`
            : `Deleted ${selectedUsers.size} users`,
        variant: "destructive",
      })
      setSelectedUsers(new Set())
    } catch (err) {
      console.error("Error deleting users", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description:
          t("language") === "fr"
            ? "Impossible de supprimer les utilisateurs sélectionnés"
            : "Unable to delete selected users",
        variant: "destructive",
      })
    }
  }

  const handleAddUser = async () => {
    if (!newUserData.name || !newUserData.email) {
      toast({
        title: "Erreur",
        description: "Le nom et l'email sont obligatoires",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingUser(true)
      await createUser({
        name: newUserData.name,
        email: newUserData.email,
        phone: newUserData.phone,
        role: newUserData.role,
        status: "pending",
      })

      toast({
        title: "✅ Utilisateur créé",
        description: `${newUserData.name} a été ajouté avec succès`,
      })

      setNewUserData({ name: "", email: "", phone: "", role: "user" })
      setShowAddUserModal(false)
    } catch (error) {
      console.error("Error creating user", error)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description: t("language") === "fr" ? "Impossible de créer l'utilisateur" : "Unable to create the user",
        variant: "destructive",
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleUserSuspended = async (userId: string) => {
    try {
      await updateUserStatus(userId, "rejected")
      toast({
        title: t("language") === "fr" ? "Compte suspendu" : "Account suspended",
        description:
          t("language") === "fr" ? "Le statut de l'utilisateur a été mis à jour" : "User status updated successfully",
      })
    } catch (error) {
      console.error("Error suspending user", error)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description: t("language") === "fr" ? "Impossible de mettre à jour le statut" : "Unable to update user status",
        variant: "destructive",
      })
    }
  }

  const handleQuickStatusChange = async (user: User, status: User["status"]) => {
    if (user.status === status) return

    try {
      await updateUserStatus(user.id, status)
      toast({
        title: status === "verified" ? "Utilisateur vérifié" : "Statut mis à jour",
        description:
          t("language") === "fr"
            ? `Le statut de ${user.name} est maintenant ${status}`
            : `${user.name} is now ${status}`,
      })
    } catch (error) {
      console.error("Error updating user status", error)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description: t("language") === "fr" ? "Impossible de mettre à jour le statut" : "Unable to update user status",
        variant: "destructive",
      })
    }
  }

  const handleUserSave = async (userId: string, data: UserFormValues) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const pendingUpdates: Partial<User> = {}
    if (user.name !== data.name) pendingUpdates.name = data.name
    if (user.email !== data.email) pendingUpdates.email = data.email
    if ((user.phone || "") !== (data.phone || "")) pendingUpdates.phone = data.phone || ""
    if (user.role !== data.role) pendingUpdates.role = data.role

    const statusChanged = user.status !== data.status

    if (!statusChanged && Object.keys(pendingUpdates).length === 0) {
      toast({
        title: t("language") === "fr" ? "Aucune modification" : "No changes detected",
        description: t("language") === "fr" ? "Aucune donnée n'a été modifiée" : "Make a change before saving",
      })
      return
    }

    try {
      setIsUpdatingUser(true)
      if (Object.keys(pendingUpdates).length > 0) {
        await updateUser(userId, pendingUpdates)
      }
      if (statusChanged) {
        await updateUserStatus(userId, data.status)
      }
      toast({
        title: t("language") === "fr" ? "Utilisateur mis à jour" : "User updated",
        description: t("language") === "fr" ? "Les informations ont été enregistrées" : "Changes saved successfully",
      })
    } catch (error) {
      console.error("Error updating user", error)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description: t("language") === "fr" ? "Impossible d'enregistrer les modifications" : "Unable to save changes",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingUser(false)
    }
  }

  const handleUserDelete = async (userId: string) => {
    try {
      setIsDeletingUser(true)
      await deleteUser(userId)
      toast({
        title: t("language") === "fr" ? "Utilisateur supprimé" : "User deleted",
        description:
          t("language") === "fr" ? "Le compte a été supprimé définitivement" : "The account has been removed",
        variant: "destructive",
      })
      setSelectedUserId(null)
    } catch (error) {
      console.error("Error deleting user", error)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description: t("language") === "fr" ? "Impossible de supprimer cet utilisateur" : "Unable to delete this user",
        variant: "destructive",
      })
    } finally {
      setIsDeletingUser(false)
    }
  }

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  }

  const roleColors: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    supervisor: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    driver: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    merchant: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    user: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  }

  const columns = [
    {
      key: "select",
      label: (
        <Checkbox
          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
          onCheckedChange={toggleAllUsers}
        />
      ),
      render: (user: User) => (
        <Checkbox checked={selectedUsers.has(user.id)} onCheckedChange={() => toggleUserSelection(user.id)} />
      ),
    },
    {
      key: "name",
      label: t("language") === "fr" ? "Utilisateur" : "User",
      render: (user: User) => (
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (user: User) => (
        <Badge variant="outline" className={roleColors[user.role]}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (user: User) => (
        <Badge variant="outline" className={statusColors[user.status]}>
          {user.status}
        </Badge>
      ),
    },
    {
      key: "phone",
      label: t("language") === "fr" ? "Téléphone" : "Phone",
      render: (user: User) => <span className="text-sm">{user.phone || "—"}</span>,
    },
    {
      key: "createdAt",
      label: t("language") === "fr" ? "Créé le" : "Created",
      render: (user: User) => (
        <span className="text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: "actions",
      label: t("actions"),
      render: (user: User) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedUserId(user.id)}>
              {t("language") === "fr" ? "Voir les détails" : "View Details"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSendMessageUser(user)}>{t("sendMessage")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>{t("resetPassword")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleQuickStatusChange(user, "verified")}>
              {t("language") === "fr" ? "Marquer comme vérifié" : "Mark as verified"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickStatusChange(user, "pending")}>
              {t("language") === "fr" ? "Revenir en attente" : "Mark as pending"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setSuspendAccountUser(user)}>
              {t("suspendAccount")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("users")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("language") === "fr"
                ? "Gérer les comptes et permissions des utilisateurs"
                : "Manage user accounts and permissions"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV(filteredUsers, "users")}>
              <Download className="mr-2 h-4 w-4" />
              {t("export")}
            </Button>
            <Button onClick={() => setShowAddUserModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("language") === "fr" ? "Ajouter un utilisateur" : "Add User"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {t("language") === "fr" ? "Erreur de chargement des utilisateurs" : "Failed to load users"}
            <span className="ml-2 text-xs text-destructive/80">{error.message}</span>
          </div>
        )}

        {loading && (
          <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("language") === "fr" ? "Chargement des utilisateurs en cours..." : "Loading users from the database..."}
          </div>
        )}

        <DataTable
          data={filteredUsers}
          columns={columns}
          searchPlaceholder={
            t("language") === "fr" ? "Rechercher par nom ou email..." : "Search users by name or email..."
          }
          onSearch={(value) => setSearchQuery(value)}
          filterComponent={
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("language") === "fr" ? "Tous les statuts" : "All Status"}</SelectItem>
                  <SelectItem value="pending">{t("language") === "fr" ? "En attente" : "Pending"}</SelectItem>
                  <SelectItem value="verified">{t("language") === "fr" ? "Vérifié" : "Verified"}</SelectItem>
                  <SelectItem value="rejected">{t("language") === "fr" ? "Rejeté" : "Rejected"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("language") === "fr" ? "Tous les rôles" : "All Roles"}</SelectItem>
                  <SelectItem value="user">{t("language") === "fr" ? "Utilisateur" : "User"}</SelectItem>
                  <SelectItem value="merchant">{t("language") === "fr" ? "Marchand" : "Merchant"}</SelectItem>
                  <SelectItem value="driver">Chauffeur</SelectItem>
                  <SelectItem value="supervisor">Superviseur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      <BulkActionsBar
        selectedCount={selectedUsers.size}
        onClear={() => setSelectedUsers(new Set())}
        onExport={handleBulkExport}
        onSendMessage={handleBulkSendMessage}
        onDelete={handleBulkDelete}
      />

      {/* View Details Modal */}
      <EntityModal
        open={!!activeUser}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
        title={t("language") === "fr" ? "Détails de l'utilisateur" : "User Details"}
        description={
          t("language") === "fr"
            ? "Voir et modifier les informations de l'utilisateur"
            : "View and edit user information"
        }
        size="lg"
      >
        {activeUser && (
          <UserDetail
            user={activeUser}
            onClose={() => setSelectedUserId(null)}
            onSave={(data) => handleUserSave(activeUser.id, data)}
            onDelete={() => handleUserDelete(activeUser.id)}
            onSuspend={() => {
              void handleUserSuspended(activeUser.id)
            }}
            isSaving={isUpdatingUser}
            isDeleting={isDeletingUser}
          />
        )}
      </EntityModal>

      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("language") === "fr" ? "Ajouter un utilisateur" : "Add User"}</DialogTitle>
            <DialogDescription>
              {t("language") === "fr" ? "Créer un nouveau compte utilisateur" : "Create a new user account"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("language") === "fr" ? "Nom complet" : "Full Name"}</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("language") === "fr" ? "Téléphone" : "Phone"}</Label>
              <Input
                id="phone"
                placeholder="+33 6 12 34 56 78"
                value={newUserData.phone}
                onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUserData.role}
                onValueChange={(value) => setNewUserData({ ...newUserData, role: value as User["role"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("language") === "fr" ? "Utilisateur" : "User"}</SelectItem>
                  <SelectItem value="merchant">{t("language") === "fr" ? "Marchand" : "Merchant"}</SelectItem>
                  <SelectItem value="driver">Chauffeur</SelectItem>
                  <SelectItem value="supervisor">Superviseur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddUserModal(false)} disabled={isCreatingUser}>
              {t("cancel")}
            </Button>
            <Button onClick={handleAddUser} disabled={isCreatingUser}>
              {isCreatingUser ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("language") === "fr" ? "Création..." : "Creating..."}
                </span>
              ) : t("language") === "fr" ? (
                "Créer l'utilisateur"
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {sendMessageUser && (
        <SendMessageModal
          isOpen={!!sendMessageUser}
          onClose={() => setSendMessageUser(null)}
          recipientName={sendMessageUser.name}
          recipientEmail={sendMessageUser.email}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          isOpen={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          userName={resetPasswordUser.name}
          userEmail={resetPasswordUser.email}
        />
      )}

      {suspendAccountUser && (
        <SuspendAccountModal
          isOpen={!!suspendAccountUser}
          onClose={() => setSuspendAccountUser(null)}
          userName={suspendAccountUser.name}
          userId={suspendAccountUser.id}
          onSuccess={async () => {
            await handleUserSuspended(suspendAccountUser.id)
            setSuspendAccountUser(null)
          }}
        />
      )}
    </AdminLayout>
  )
}
