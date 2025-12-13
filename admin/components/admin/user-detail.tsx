"use client"

import { useEffect, useState } from "react"
import type { User } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityLogPanel } from "./activity-log-panel"
import { SendMessageModal, ResetPasswordModal, SuspendAccountModal } from "./action-modals"
import { Mail, KeyRound, Ban, Loader2, UserCircle, History } from "lucide-react"

type EditableUserFields = Pick<User, "name" | "email" | "phone" | "role" | "status">

interface UserDetailProps {
  user: User
  onClose: () => void
  onSave: (data: EditableUserFields) => Promise<void> | void
  onDelete: () => Promise<void> | void
  onSuspend?: () => void
  isSaving?: boolean
  isDeleting?: boolean
}

export function UserDetail({ user, onClose, onSave, onDelete, onSuspend, isSaving = false, isDeleting = false }: UserDetailProps) {
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [formData, setFormData] = useState<EditableUserFields>({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    status: user.status,
  })

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      status: user.status,
    })
  }, [user])

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  }

  const handleFieldChange = (field: keyof EditableUserFields, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    await onSave(formData)
  }

  const handleDelete = async () => {
    await onDelete()
  }

  const hasChanges =
    formData.name !== user.name ||
    formData.email !== user.email ||
    (formData.phone || "") !== (user.phone || "") ||
    formData.role !== user.role ||
    formData.status !== user.status

  const handleOpenMessageModal = () => {
    console.log("[v0] UserDetail - Opening message modal")
    setShowMessageModal(true)
  }

  const handleOpenResetModal = () => {
    console.log("[v0] UserDetail - Opening reset modal")
    setShowResetModal(true)
  }

  const handleOpenSuspendModal = () => {
    console.log("[v0] UserDetail - Opening suspend modal")
    setShowSuspendModal(true)
  }

  console.log("[v0] UserDetail - Modal states:", {
    showMessageModal,
    showResetModal,
    showSuspendModal,
  })

  return (
    <>
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">
            <UserCircle className="mr-2 h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">
            <History className="mr-2 h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{formData.name}</h3>
              <p className="text-sm text-muted-foreground">{formData.email}</p>
            </div>
            <Badge variant="outline" className={statusColors[formData.status]}>
              {formData.status}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleFieldChange("role", value)} disabled={isSaving}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFieldChange("status", value)} disabled={isSaving}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">User Metadata</h4>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">User ID</div>
                <div className="text-sm font-mono">{user.id}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Created</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Actions Rapides</h4>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start bg-transparent" onClick={handleOpenMessageModal}>
                <Mail className="mr-2 h-4 w-4" />
                Envoyer un message
              </Button>
              <Button variant="outline" className="justify-start bg-transparent" onClick={handleOpenResetModal}>
                <KeyRound className="mr-2 h-4 w-4" />
                Réinitialiser le mot de passe
              </Button>
              <Button
                variant="outline"
                className="justify-start bg-transparent text-destructive hover:text-destructive"
                onClick={handleOpenSuspendModal}
              >
                <Ban className="mr-2 h-4 w-4" />
                Suspendre le compte
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isSaving}>
              Cancel
            </Button>
          </div>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <h4 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Permanently delete this user and all associated data. This action cannot be undone.
            </p>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete User"
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Activity Log</h4>
            <p className="text-xs text-muted-foreground">
              Complete history of administrative actions on this user account
            </p>
          </div>
          <ActivityLogPanel entityType="user" entityId={user.id} maxHeight="480px" />
        </TabsContent>
      </Tabs>

      <SendMessageModal
        isOpen={showMessageModal}
        onClose={() => {
          console.log("[v0] UserDetail - Closing message modal")
          setShowMessageModal(false)
        }}
        recipientName={user.name}
        recipientEmail={user.email}
      />
      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={() => {
          console.log("[v0] UserDetail - Closing reset modal")
          setShowResetModal(false)
        }}
        userName={user.name}
        userEmail={user.email}
      />
      <SuspendAccountModal
        isOpen={showSuspendModal}
        onClose={() => {
          console.log("[v0] UserDetail - Closing suspend modal")
          setShowSuspendModal(false)
        }}
        userName={user.name}
        userId={user.id}
        onSuccess={onSuspend}
      />
    </>
  )
}
