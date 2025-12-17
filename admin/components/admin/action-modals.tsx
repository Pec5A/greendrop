"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Mail, Send, CheckCircle2, Loader2 } from "lucide-react"

interface SendMessageModalProps {
  isOpen: boolean
  onClose: () => void
  recipientName: string
  recipientEmail: string
}

export function SendMessageModal({ isOpen, onClose, recipientName, recipientEmail }: SendMessageModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    console.log("[v0] SendMessage modal - Starting send process")
    console.log("[v0] Recipient:", recipientName, recipientEmail)
    console.log("[v0] Subject:", subject)
    console.log("[v0] Message:", message)

    if (!subject.trim() || !message.trim()) {
      console.log("[v0] Validation failed - empty fields")
      toast({
        title: "Erreur",
        description: "Le sujet et le message sont obligatoires",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("[v0] Message sent successfully")
      toast({
        title: "✅ Message envoyé avec succès",
        description: `Votre message a été envoyé à ${recipientName}`,
        duration: 4000,
      })

      // Reset form and close
      setSubject("")
      setMessage("")
      onClose()
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] SendMessage modal open state:", open)
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("sendMessage")}
          </DialogTitle>
          <DialogDescription>
            Envoyer un message à {recipientName} ({recipientEmail})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              placeholder="Entrez le sujet du message"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Entrez votre message ici..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="bg-transparent" disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSend} disabled={!subject || !message || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ResetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  userEmail: string
}

export function ResetPasswordModal({ isOpen, onClose, userName, userEmail }: ResetPasswordModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleReset = async () => {
    console.log("[v0] ResetPassword modal - Starting reset process")
    console.log("[v0] User:", userName, userEmail)

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("[v0] Password reset email sent successfully")
      toast({
        title: "✅ Email de réinitialisation envoyé",
        description: `Un lien de réinitialisation a été envoyé à ${userEmail}`,
        duration: 4000,
      })

      onClose()
    } catch (error) {
      console.error("[v0] Error resetting password:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email de réinitialisation",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] ResetPassword modal open state:", open)
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("resetPassword")}</DialogTitle>
          <DialogDescription>
            Un email de réinitialisation sera envoyé à {userName} ({userEmail})
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              L'utilisateur recevra un email avec un lien pour créer un nouveau mot de passe. Le lien sera valide
              pendant 24 heures.
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent" disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleReset} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("confirm")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SuspendAccountModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  userId: string
  onSuccess?: () => void // Add callback
}

export function SuspendAccountModal({ isOpen, onClose, userName, userId, onSuccess }: SuspendAccountModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [reason, setReason] = useState("")
  const [duration, setDuration] = useState("7")
  const [isLoading, setIsLoading] = useState(false)

  const handleSuspend = async () => {
    console.log("[v0] SuspendAccount modal - Starting suspension")
    console.log("[v0] User ID:", userId, "Duration:", duration)
    console.log("[v0] Reason:", reason)

    if (!reason.trim()) {
      console.log("[v0] Validation failed - no reason provided")
      toast({
        title: "Erreur",
        description: "Vous devez fournir une raison pour la suspension",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("[v0] Account suspended successfully")
      const durationText =
        duration === "7" ? "7 jours" : duration === "30" ? "30 jours" : duration === "90" ? "90 jours" : "indéfiniment"
      toast({
        title: "✅ Compte suspendu",
        description: `Le compte de ${userName} a été suspendu pour ${durationText}`,
        variant: "destructive",
        duration: 4000,
      })

      setReason("")
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error("[v0] Error suspending account:", error)
      toast({
        title: "Erreur",
        description: "Impossible de suspendre le compte",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] SuspendAccount modal open state:", open)
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">{t("suspendAccount")}</DialogTitle>
          <DialogDescription>Suspendre temporairement le compte de {userName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Durée de suspension</Label>
            <Select value={duration} onValueChange={setDuration} disabled={isLoading}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 jour</SelectItem>
                <SelectItem value="3">3 jours</SelectItem>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="14">14 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Raison de la suspension</Label>
            <Textarea
              id="reason"
              placeholder="Expliquez pourquoi ce compte est suspendu..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm text-foreground">
              L'utilisateur ne pourra pas se connecter pendant cette période et recevra une notification par email.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="bg-transparent" disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleSuspend} disabled={!reason || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suspension...
              </>
            ) : (
              "Suspendre le compte"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface UpdateOrderStatusModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  currentStatus: string
  onSuccess?: (newStatus: string) => void // Add callback
}

export function UpdateOrderStatusModal({
  isOpen,
  onClose,
  orderId,
  currentStatus,
  onSuccess,
}: UpdateOrderStatusModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [status, setStatus] = useState(currentStatus)
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdate = async () => {
    console.log("[v0] UpdateOrderStatus modal - Starting update")
    console.log("[v0] Order ID:", orderId, "New status:", status)
    console.log("[v0] Note:", note)

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("[v0] Order status updated successfully")
      toast({
        title: "✅ Statut mis à jour",
        description: `La commande ${orderId} est maintenant: ${status}`,
        duration: 4000,
      })

      setNote("")
      if (onSuccess) {
        onSuccess(status)
      }
      onClose()
    } catch (error) {
      console.error("[v0] Error updating order status:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] UpdateOrderStatus modal open state:", open)
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("updateStatus")}</DialogTitle>
          <DialogDescription>Mettre à jour le statut de la commande {orderId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="order-status">Nouveau statut</Label>
            <Select value={status} onValueChange={setStatus} disabled={isLoading}>
              <SelectTrigger id="order-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Créée</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="shipped">Expédiée</SelectItem>
                <SelectItem value="delivered">Livrée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnelle)</Label>
            <Textarea
              id="note"
              placeholder="Ajouter une note sur cette mise à jour..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="bg-transparent" disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              "Mettre à jour"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ContactCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  customerName: string
  customerEmail: string
}

export function ContactCustomerModal({
  isOpen,
  onClose,
  orderId,
  customerName,
  customerEmail,
}: ContactCustomerModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    console.log("[v0] ContactCustomer modal - Starting contact")
    console.log("[v0] Order ID:", orderId, "Customer:", customerName)
    console.log("[v0] Message:", message)

    if (!message.trim()) {
      console.log("[v0] Validation failed - empty message")
      toast({
        title: "Erreur",
        description: "Le message ne peut pas être vide",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("[v0] Message sent to customer successfully")
      toast({
        title: "✅ Message envoyé",
        description: `Votre message a été envoyé à ${customerName}`,
        duration: 4000,
      })

      setMessage("")
      onClose()
    } catch (error) {
      console.error("[v0] Error contacting customer:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] ContactCustomer modal open state:", open)
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("contactCustomer")}
          </DialogTitle>
          <DialogDescription>
            Contacter {customerName} à propos de la commande {orderId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm">
              <div className="font-medium">Client: {customerName}</div>
              <div className="text-muted-foreground">{customerEmail}</div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-message">Message</Label>
            <Textarea
              id="customer-message"
              placeholder="Entrez votre message au client..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="bg-transparent" disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSend} disabled={!message || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CancelOrderModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  onSuccess?: () => void // Add callback
}

export function CancelOrderModal({ isOpen, onClose, orderId, onSuccess }: CancelOrderModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [reason, setReason] = useState("")
  const [refund, setRefund] = useState("full")
  const [isLoading, setIsLoading] = useState(false)

  const handleCancel = async () => {
    console.log("[v0] CancelOrder modal - Starting cancellation")
    console.log("[v0] Order ID:", orderId, "Refund type:", refund)
    console.log("[v0] Reason:", reason)

    if (!reason.trim()) {
      console.log("[v0] Validation failed - no reason provided")
      toast({
        title: "Erreur",
        description: "Vous devez fournir une raison pour l'annulation",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const refundText = refund === "full" ? "complet" : refund === "partial" ? "partiel" : "sans remboursement"
      console.log("[v0] Order cancelled successfully")
      toast({
        title: "✅ Commande annulée",
        description: `La commande ${orderId} a été annulée avec remboursement ${refundText}`,
        duration: 4000,
      })

      setReason("")
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error("[v0] Error cancelling order:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la commande",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] CancelOrder modal open state:", open)
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">{t("cancelOrder")}</DialogTitle>
          <DialogDescription>Annuler la commande {orderId} et rembourser le client</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="refund-type">Type de remboursement</Label>
            <Select value={refund} onValueChange={setRefund} disabled={isLoading}>
              <SelectTrigger id="refund-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Remboursement complet</SelectItem>
                <SelectItem value="partial">Remboursement partiel</SelectItem>
                <SelectItem value="none">Aucun remboursement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Raison de l'annulation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Expliquez pourquoi cette commande est annulée..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm text-foreground">
              Le client recevra une notification d'annulation et le remboursement sera traité automatiquement.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="bg-transparent" disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={!reason || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Annulation...
              </>
            ) : (
              "Annuler la commande"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// AssignDriverModal - Assign a driver to an order
interface AssignDriverModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  drivers: Array<{ id: string; name: string; status: string; vehicleType?: string; currentOrderId?: string | null }>
  onAssign: (driverId: string) => Promise<void>
}

export function AssignDriverModal({ isOpen, onClose, orderId, drivers, onAssign }: AssignDriverModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [selectedDriver, setSelectedDriver] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const availableDrivers = drivers.filter((driver) => driver.status !== "offline")

  const handleAssign = async () => {
    if (!selectedDriver) {
      toast({
        title: t("language") === "fr" ? "Sélectionnez un chauffeur" : "Pick a driver",
        description:
          t("language") === "fr"
            ? "Choisissez un chauffeur disponible pour cette commande"
            : "Choose an available driver for the order",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await onAssign(selectedDriver)
      toast({
        title: t("language") === "fr" ? "Chauffeur assigné" : "Driver assigned",
        description:
          t("language") === "fr"
            ? `La commande ${orderId} sera prise en charge immédiatement`
            : `Order ${orderId} will be handled right away`,
      })
      setSelectedDriver("")
      onClose()
    } catch (error) {
      console.error("Error assigning driver", error)
      toast({
        title: t("language") === "fr" ? "Erreur" : "Error",
        description:
          t("language") === "fr"
            ? "Impossible d'assigner le chauffeur. Réessayez."
            : "Unable to assign driver. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("language") === "fr" ? "Assigner un chauffeur" : "Assign driver"}</DialogTitle>
          <DialogDescription>
            {t("language") === "fr"
              ? "Sélectionnez un chauffeur disponible pour cette commande"
              : "Select an available driver for this order"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="driver">
              {t("language") === "fr" ? "Chauffeurs disponibles" : "Available drivers"}
            </Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver} disabled={isLoading || availableDrivers.length === 0}>
              <SelectTrigger id="driver">
                <SelectValue placeholder={t("language") === "fr" ? "Choisir un chauffeur" : "Choose a driver"} />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {t("language") === "fr" ? "Aucun chauffeur connecté" : "No online drivers"}
                  </div>
                ) : (
                  availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex flex-col items-start">
                        <div className="text-sm font-medium">
                          {driver.name} {driver.status === "busy" && "• Busy"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {driver.vehicleType ?? "vehicle"}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="bg-transparent" disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleAssign} disabled={!selectedDriver || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("language") === "fr" ? "Assignation..." : "Assigning..."}
              </>
            ) : (
              t("language") === "fr" ? "Assigner" : "Assign"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CreateDriverModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (driver: any) => void
}

export function CreateDriverModal({ isOpen, onClose, onSuccess }: CreateDriverModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "car",
    vehiclePlate: "",
    password: "",
  })

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password.trim()) {
      toast({
        title: t("language") === "fr" ? "Erreur" : "Error",
        description: t("language") === "fr" ? "Veuillez remplir tous les champs obligatoires" : "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call to create driver
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const newDriver = {
        id: `driver_${Date.now()}`,
        ...formData,
        status: "offline",
        rating: 0,
        completedOrders: 0,
        createdAt: new Date().toISOString(),
      }

      toast({
        title: t("language") === "fr" ? "✓ Chauffeur créé" : "✓ Driver created",
        description: t("language") === "fr" ? `${formData.name} a été ajouté avec succès` : `${formData.name} has been added successfully`,
      })

      onSuccess(newDriver)
      setFormData({
        name: "",
        email: "",
        phone: "",
        vehicleType: "car",
        vehiclePlate: "",
        password: "",
      })
      onClose()
    } catch (error) {
      console.error("Error creating driver:", error)
      toast({
        title: t("language") === "fr" ? "Erreur" : "Error",
        description: t("language") === "fr" ? "Impossible de créer le chauffeur" : "Failed to create driver",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("language") === "fr" ? "Nouveau chauffeur" : "New driver"}</DialogTitle>
          <DialogDescription>
            {t("language") === "fr" ? "Créer un nouveau compte chauffeur pour la flotte" : "Create a new driver account for the fleet"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("language") === "fr" ? "Nom complet" : "Full name"} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("language") === "fr" ? "ex: Mohamed Amrani" : "e.g. Mohamed Amrani"}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("language") === "fr" ? "Email" : "Email"} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="driver@example.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("language") === "fr" ? "Téléphone" : "Phone"} *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+212 6XX XXX XXX"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleType">{t("language") === "fr" ? "Type de véhicule" : "Vehicle type"}</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                disabled={isLoading}
              >
                <SelectTrigger id="vehicleType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">{t("language") === "fr" ? "Voiture" : "Car"}</SelectItem>
                  <SelectItem value="motorcycle">{t("language") === "fr" ? "Moto" : "Motorcycle"}</SelectItem>
                  <SelectItem value="scooter">{t("language") === "fr" ? "Scooter" : "Scooter"}</SelectItem>
                  <SelectItem value="bicycle">{t("language") === "fr" ? "Vélo" : "Bicycle"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">{t("language") === "fr" ? "Immatriculation" : "License plate"}</Label>
              <Input
                id="vehiclePlate"
                value={formData.vehiclePlate}
                onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                placeholder={t("language") === "fr" ? "ex: 12345-أ-67" : "e.g. 12345-A-67"}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("language") === "fr" ? "Mot de passe initial" : "Initial password"} *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {t("language") === "fr" ? "Le chauffeur pourra le modifier après connexion" : "Driver can change it after first login"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="bg-transparent">
            {t("language") === "fr" ? "Annuler" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("language") === "fr" ? "Création..." : "Creating..."}
              </>
            ) : (
              t("language") === "fr" ? "Créer le chauffeur" : "Create driver"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ApproveStoreModalProps {
  isOpen: boolean
  onClose: () => void
  shop: {
    id: string
    name: string
    ownerName?: string
    approvalStatus?: string
  }
  onApprove: (shopId: string) => void
  onReject: (shopId: string, reason: string) => void
}

export function ApproveStoreModal({ isOpen, onClose, shop, onApprove, onReject }: ApproveStoreModalProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  const handleAction = async () => {
    if (action === "reject" && !rejectionReason.trim()) {
      toast({
        title: t("language") === "fr" ? "Erreur" : "Error",
        description: t("language") === "fr" ? "Veuillez indiquer une raison de rejet" : "Please provide a rejection reason",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (action === "approve") {
        onApprove(shop.id)
        toast({
          title: t("language") === "fr" ? "✓ Boutique approuvée" : "✓ Store approved",
          description: t("language") === "fr" ? `${shop.name} est maintenant active` : `${shop.name} is now active`,
        })
      } else if (action === "reject") {
        onReject(shop.id, rejectionReason)
        toast({
          title: t("language") === "fr" ? "Boutique rejetée" : "Store rejected",
          description: t("language") === "fr" ? `${shop.name} a été rejetée` : `${shop.name} has been rejected`,
          variant: "destructive",
        })
      }

      setRejectionReason("")
      setAction(null)
      onClose()
    } catch (error) {
      console.error("Error processing store approval:", error)
      toast({
        title: t("language") === "fr" ? "Erreur" : "Error",
        description: t("language") === "fr" ? "Impossible de traiter la demande" : "Failed to process request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("language") === "fr" ? "Validation de boutique" : "Store Approval"}</DialogTitle>
          <DialogDescription>
            {t("language") === "fr" ? "Approuver ou rejeter la demande de boutique" : "Approve or reject this store application"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">{t("language") === "fr" ? "Nom de la boutique:" : "Store name:"}</span>
              <span className="text-sm">{shop.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">{t("language") === "fr" ? "Propriétaire:" : "Owner:"}</span>
              <span className="text-sm">{shop.ownerName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Statut:</span>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                {shop.approvalStatus || "pending"}
              </Badge>
            </div>
          </div>

          {action === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">{t("language") === "fr" ? "Raison du rejet *" : "Rejection reason *"}</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("language") === "fr" ? "Expliquez pourquoi cette boutique est rejetée..." : "Explain why this store is being rejected..."}
                rows={4}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="bg-transparent">
            {t("language") === "fr" ? "Annuler" : "Cancel"}
          </Button>
          {action === null && (
            <>
              <Button
                variant="destructive"
                onClick={() => setAction("reject")}
                disabled={isLoading}
              >
                {t("language") === "fr" ? "Rejeter" : "Reject"}
              </Button>
              <Button
                onClick={() => {
                  setAction("approve")
                  setTimeout(() => handleAction(), 0)
                }}
                disabled={isLoading}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("language") === "fr" ? "Approuver" : "Approve"}
              </Button>
            </>
          )}
          {action === "reject" && (
            <Button onClick={handleAction} disabled={isLoading} variant="destructive">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("language") === "fr" ? "Rejet..." : "Rejecting..."}
                </>
              ) : (
                t("language") === "fr" ? "Confirmer le rejet" : "Confirm Rejection"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
