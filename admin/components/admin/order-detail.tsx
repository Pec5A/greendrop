"use client"

import { useState } from "react"
import type { Order, OrderTimelineEvent, OrderDocument } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TimelineStepper } from "./timeline-stepper"
import { ActivityLogPanel } from "./activity-log-panel"
import { UpdateOrderStatusModal, ContactCustomerModal, CancelOrderModal } from "./action-modals"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { 
  RefreshCw, 
  Mail, 
  XCircle, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  User,
  Package,
  History
} from "lucide-react"

interface OrderDetailProps {
  order: Order
  onClose: () => void
  onUpdate?: (orderId: string, updates: Partial<Order>) => Promise<void>
}

export function OrderDetail({ order, onClose, onUpdate }: OrderDetailProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const isFrench = t("language") === "fr"
  
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  
  // Timeline management
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventDescription, setNewEventDescription] = useState("")
  const [newEventType, setNewEventType] = useState<OrderTimelineEvent["type"]>("note")
  const [addingEvent, setAddingEvent] = useState(false)
  
  // Document management
  const [newDocLabel, setNewDocLabel] = useState("")
  const [newDocType, setNewDocType] = useState<OrderDocument["type"]>("proof")
  const [newDocUrl, setNewDocUrl] = useState("")
  const [uploadingDoc, setUploadingDoc] = useState(false)
  
  // Notes
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  const statusColors = {
    created: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
    paid: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    shipped: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  }

  const handleOpenStatusModal = () => {
    console.log("[v0] OrderDetail - Opening status modal")
    setShowStatusModal(true)
  }

  const handleOpenContactModal = () => {
    console.log("[v0] OrderDetail - Opening contact modal")
    setShowContactModal(true)
  }

  const handleOpenCancelModal = () => {
    console.log("[v0] OrderDetail - Opening cancel modal")
    setShowCancelModal(true)
  }

  const handleAddTimelineEvent = async () => {
    if (!newEventTitle.trim()) {
      toast({
        title: isFrench ? "Titre requis" : "Title required",
        variant: "destructive",
      })
      return
    }
    
    if (!onUpdate) {
      toast({
        title: isFrench ? "Fonction de mise à jour manquante" : "Update function missing",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingEvent(true)
      const newEvent: OrderTimelineEvent = {
        id: `evt-${Date.now()}`,
        orderId: order.id,
        type: newEventType,
        title: newEventTitle.trim(),
        description: newEventDescription.trim() || undefined,
        timestamp: new Date().toISOString(),
        status: "completed",
      }
      
      const updatedTimeline = [...(order.timeline || []), newEvent]
      await onUpdate(order.id, { timeline: updatedTimeline })
      
      toast({
        title: isFrench ? "Événement ajouté" : "Event added",
        description: newEventTitle,
      })
      
      setNewEventTitle("")
      setNewEventDescription("")
      setNewEventType("note")
    } catch (error) {
      console.error("Error adding timeline event", error)
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench ? "Impossible d'ajouter l'événement" : "Unable to add event",
        variant: "destructive",
      })
    } finally {
      setAddingEvent(false)
    }
  }

  const handleAddDocument = async () => {
    if (!newDocLabel.trim() || !newDocUrl.trim()) {
      toast({
        title: isFrench ? "Label et URL requis" : "Label and URL required",
        variant: "destructive",
      })
      return
    }
    
    if (!onUpdate) {
      toast({
        title: isFrench ? "Fonction de mise à jour manquante" : "Update function missing",
        variant: "destructive",
      })
      return
    }

    try {
      setUploadingDoc(true)
      const newDoc: OrderDocument = {
        id: `doc-${Date.now()}`,
        orderId: order.id,
        label: newDocLabel.trim(),
        type: newDocType,
        url: newDocUrl.trim(),
        uploadedAt: new Date().toISOString(),
      }
      
      const updatedDocs = [...(order.documents || []), newDoc]
      await onUpdate(order.id, { documents: updatedDocs })
      
      toast({
        title: isFrench ? "Document ajouté" : "Document added",
        description: newDocLabel,
      })
      
      setNewDocLabel("")
      setNewDocUrl("")
      setNewDocType("proof")
    } catch (error) {
      console.error("Error adding document", error)
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench ? "Impossible d'ajouter le document" : "Unable to add document",
        variant: "destructive",
      })
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleRemoveDocument = async (docId: string) => {
    if (!onUpdate) return
    
    try {
      const updatedDocs = (order.documents || []).filter((doc) => doc.id !== docId)
      await onUpdate(order.id, { documents: updatedDocs })
      
      toast({
        title: isFrench ? "Document supprimé" : "Document removed",
      })
    } catch (error) {
      console.error("Error removing document", error)
      toast({
        title: isFrench ? "Erreur" : "Error",
        variant: "destructive",
      })
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast({
        title: isFrench ? "Note vide" : "Empty note",
        variant: "destructive",
      })
      return
    }
    
    if (!onUpdate) {
      toast({
        title: isFrench ? "Fonction de mise à jour manquante" : "Update function missing",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingNote(true)
      const updatedNotes = [...(order.notes || []), newNote.trim()]
      await onUpdate(order.id, { notes: updatedNotes })
      
      toast({
        title: isFrench ? "Note ajoutée" : "Note added",
      })
      
      setNewNote("")
    } catch (error) {
      console.error("Error adding note", error)
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench ? "Impossible d'ajouter la note" : "Unable to add note",
        variant: "destructive",
      })
    } finally {
      setAddingNote(false)
    }
  }

  console.log("[v0] OrderDetail - Modal states:", {
    showStatusModal,
    showContactModal,
    showCancelModal,
  })

  const eventTypeIcons = {
    status: <CheckCircle2 className="h-4 w-4" />,
    assignment: <User className="h-4 w-4" />,
    exception: <AlertTriangle className="h-4 w-4" />,
    note: <FileText className="h-4 w-4" />,
    document: <Upload className="h-4 w-4" />,
  }

  const eventTypeLabels = {
    status: isFrench ? "Statut" : "Status",
    assignment: isFrench ? "Assignation" : "Assignment",
    exception: isFrench ? "Exception" : "Exception",
    note: isFrench ? "Note" : "Note",
    document: isFrench ? "Document" : "Document",
  }

  const docTypeLabels = {
    invoice: isFrench ? "Facture" : "Invoice",
    proof: isFrench ? "Preuve" : "Proof",
    photo: isFrench ? "Photo" : "Photo",
    note: isFrench ? "Note" : "Note",
    other: isFrench ? "Autre" : "Other",
  }

  const getTimelineSteps = () => {
    const statusOrder = ["created", "paid", "shipped", "delivered"]
    const currentIndex = statusOrder.indexOf(order.status)

    return statusOrder.map((status, index) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      status:
        index < currentIndex
          ? ("completed" as const)
          : index === currentIndex
            ? ("current" as const)
            : ("upcoming" as const),
      timestamp: index <= currentIndex ? new Date(order.updatedAt).toLocaleString() : undefined,
    }))
  }

  return (
    <>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <Package className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isFrench ? "Aperçu" : "Overview"}</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm">
            <Clock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Timeline</span>
            <span className="sm:hidden">Time</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm">
            <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isFrench ? "Documents" : "Docs"}</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs sm:text-sm">
            <AlertTriangle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Notes</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm">
            <History className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isFrench ? "Activité" : "Activity"}</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {isFrench ? "Commande" : "Order"} {order.reference || `#${order.id.slice(-6).toUpperCase()}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isFrench ? "Créée le" : "Placed on"} {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline" className={statusColors[order.status]}>
              {t(order.status)}
            </Badge>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{isFrench ? "Priorité" : "Priority"}</Label>
              <p className="text-sm font-medium">{order.priority || "normal"}</p>
            </div>
            {order.driverName && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{isFrench ? "Chauffeur" : "Driver"}</Label>
                <p className="text-sm font-medium">{order.driverName}</p>
                {order.driverPhone && <p className="text-xs text-muted-foreground">{order.driverPhone}</p>}
              </div>
            )}
            {order.expectedDelivery && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{isFrench ? "Livraison prévue" : "Expected delivery"}</Label>
                <p className="text-sm font-medium">{new Date(order.expectedDelivery).toLocaleString()}</p>
              </div>
            )}
            {order.deliveredAt && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{isFrench ? "Livrée le" : "Delivered at"}</Label>
                <p className="text-sm font-medium">{new Date(order.deliveredAt).toLocaleString()}</p>
              </div>
            )}
          </div>

          {order.addresses && order.addresses.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">{isFrench ? "Adresses" : "Addresses"}</h4>
                {order.addresses.map((addr, idx) => (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium uppercase text-muted-foreground">{addr.label}</p>
                        <p className="text-sm">{addr.street}</p>
                        <p className="text-sm text-muted-foreground">
                          {addr.city} {addr.postalCode}
                        </p>
                        {addr.instructions && <p className="mt-1 text-xs text-muted-foreground italic">{addr.instructions}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-4">{isFrench ? "Articles" : "Order Timeline"}</h4>
            <TimelineStepper steps={getTimelineSteps()} />
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">{isFrench ? "Produits" : "Order Items"}</h4>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium text-sm">{item.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {isFrench ? "Quantité" : "Quantity"}: {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-medium">${item.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">${order.total.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Actions rapides" : "Quick Actions"}</h4>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start bg-transparent" onClick={handleOpenStatusModal}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("updateStatus")}
              </Button>
              <Button variant="outline" className="justify-start bg-transparent" onClick={handleOpenContactModal}>
                <Mail className="mr-2 h-4 w-4" />
                {t("contactCustomer")}
              </Button>
              <Button
                variant="outline"
                className="justify-start bg-transparent text-destructive hover:text-destructive"
                onClick={handleOpenCancelModal}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("cancelOrder")}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Historique des événements" : "Event History"}</h4>
            <ScrollArea className="h-[360px] pr-4">
              {(!order.timeline || order.timeline.length === 0) && (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
                  {isFrench ? "Aucun événement enregistré" : "No events recorded yet"}
                </div>
              )}
              <div className="space-y-3">
                {(order.timeline || []).map((event) => (
                  <div key={event.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{eventTypeIcons[event.type]}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{event.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {eventTypeLabels[event.type]}
                          </Badge>
                        </div>
                        {event.description && <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                          {event.actor && ` • ${event.actor}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Ajouter un événement" : "Add Event"}</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{isFrench ? "Type" : "Type"}</Label>
                <Select value={newEventType} onValueChange={(value) => setNewEventType(value as OrderTimelineEvent["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">{eventTypeLabels.note}</SelectItem>
                    <SelectItem value="status">{eventTypeLabels.status}</SelectItem>
                    <SelectItem value="assignment">{eventTypeLabels.assignment}</SelectItem>
                    <SelectItem value="exception">{eventTypeLabels.exception}</SelectItem>
                    <SelectItem value="document">{eventTypeLabels.document}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isFrench ? "Titre" : "Title"}</Label>
                <Input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder={isFrench ? "Ex: Retard de 15 min" : "e.g., Delayed by 15 min"} />
              </div>
              <div className="space-y-2">
                <Label>{isFrench ? "Description (optionnel)" : "Description (optional)"}</Label>
                <Textarea rows={3} value={newEventDescription} onChange={(e) => setNewEventDescription(e.target.value)} />
              </div>
              <Button onClick={handleAddTimelineEvent} disabled={addingEvent || !newEventTitle.trim()} className="w-full">
                {addingEvent ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isFrench ? "Ajout..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {isFrench ? "Ajouter" : "Add Event"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Documents attachés" : "Attached Documents"}</h4>
            <ScrollArea className="h-[360px] pr-4">
              {(!order.documents || order.documents.length === 0) && (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
                  {isFrench ? "Aucun document" : "No documents attached"}
                </div>
              )}
              <div className="space-y-2">
                {(order.documents || []).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {docTypeLabels[doc.type]} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => window.open(doc.url, "_blank")}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveDocument(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Ajouter un document" : "Add Document"}</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{isFrench ? "Type de document" : "Document Type"}</Label>
                <Select value={newDocType} onValueChange={(value) => setNewDocType(value as OrderDocument["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">{docTypeLabels.invoice}</SelectItem>
                    <SelectItem value="proof">{docTypeLabels.proof}</SelectItem>
                    <SelectItem value="photo">{docTypeLabels.photo}</SelectItem>
                    <SelectItem value="note">{docTypeLabels.note}</SelectItem>
                    <SelectItem value="other">{docTypeLabels.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isFrench ? "Label" : "Label"}</Label>
                <Input value={newDocLabel} onChange={(e) => setNewDocLabel(e.target.value)} placeholder={isFrench ? "Ex: Preuve de livraison" : "e.g., Proof of Delivery"} />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={newDocUrl} onChange={(e) => setNewDocUrl(e.target.value)} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">
                  {isFrench ? "Lien vers le fichier (Storage, etc.)" : "Link to file (Storage, etc.)"}
                </p>
              </div>
              <Button onClick={handleAddDocument} disabled={uploadingDoc || !newDocLabel.trim() || !newDocUrl.trim()} className="w-full">
                {uploadingDoc ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isFrench ? "Ajout..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {isFrench ? "Ajouter le document" : "Add Document"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Notes internes" : "Internal Notes"}</h4>
            <ScrollArea className="h-[360px] pr-4">
              {(!order.notes || order.notes.length === 0) && (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
                  {isFrench ? "Aucune note" : "No notes yet"}
                </div>
              )}
              <div className="space-y-2">
                {(order.notes || []).map((note, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <p className="text-sm">{note}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Ajouter une note" : "Add Note"}</h4>
            <div className="space-y-3">
              <Textarea rows={4} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={isFrench ? "Saisir une note..." : "Type a note..."} />
              <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="w-full">
                {addingNote ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isFrench ? "Ajout..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {isFrench ? "Ajouter la note" : "Add Note"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{isFrench ? "Journal d'activité" : "Activity Log"}</h4>
            <p className="text-xs text-muted-foreground">
              {isFrench 
                ? "Historique complet des actions administratives sur cette commande"
                : "Complete history of administrative actions on this order"}
            </p>
          </div>
          <ActivityLogPanel entityType="order" entityId={order.id} maxHeight="480px" />
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
          {t("close")}
        </Button>
      </div>

      <UpdateOrderStatusModal
        isOpen={showStatusModal}
        onClose={() => {
          console.log("[v0] OrderDetail - Closing status modal")
          setShowStatusModal(false)
        }}
        orderId={order.id}
        currentStatus={order.status}
      />
      <ContactCustomerModal
        isOpen={showContactModal}
        onClose={() => {
          console.log("[v0] OrderDetail - Closing contact modal")
          setShowContactModal(false)
        }}
        orderId={order.id}
        customerName="Customer Name"
        customerEmail="customer@example.com"
      />
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => {
          console.log("[v0] OrderDetail - Closing cancel modal")
          setShowCancelModal(false)
        }}
        orderId={order.id}
      />
    </>
  )
}
