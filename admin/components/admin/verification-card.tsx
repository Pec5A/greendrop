"use client"

import { useState, useCallback } from "react"
import { ref, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase/config"
import type { Verification } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle, XCircle, FileText, User, Paperclip, Download, Clock } from "lucide-react"
import { StorageImage } from "@/components/admin/storage-image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface VerificationCardProps {
  verification: Verification
  userName: string
  userEmail: string
  onApprove?: (verificationId: string) => Promise<void> | void
  onReject?: (verificationId: string, reason?: string) => Promise<void> | void
}

export function VerificationCard({ verification, userName, userEmail, onApprove, onReject }: VerificationCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const attachments = verification.attachments ?? []
  const history = verification.history ?? []
  const latestHistoryEntry = history[history.length - 1]

  const formatDateTime = (value?: string) => {
    if (!value) return "—"
    return new Date(value).toLocaleString()
  }

  const isImageAttachment = (attachmentUrl: string, mimeType?: string) => {
    if (mimeType) {
      return mimeType.startsWith("image/")
    }
    return /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(attachmentUrl)
  }

  const openAttachment = useCallback(async (url: string) => {
    try {
      const urlObj = new URL(url)
      const match = urlObj.pathname.match(/\/o\/(.+)$/)
      const path = match ? decodeURIComponent(match[1]) : null
      const signedUrl = path ? await getDownloadURL(ref(storage, path)) : url
      window.open(signedUrl, "_blank")
    } catch {
      window.open(url, "_blank")
    }
  }, [])

  const typeLabels = {
    id: "Government ID",
    license: "Driver License",
    business: "Business License",
  }

  const documentTypeLabels: Record<string, string> = {
    id_card: "Carte d'identité",
    passport: "Passeport",
    driving_license: "Permis de conduire",
    residence_permit: "Titre de séjour",
  }

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  }

  const handleApprove = async () => {
    if (!onApprove) {
      console.warn("Approve handler not provided for verification", verification.id)
      return
    }

    try {
      setIsApproving(true)
      await onApprove(verification.id)
    } catch (error) {
      console.error("Failed to approve verification", verification.id, error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!onReject) {
      console.warn("Reject handler not provided for verification", verification.id)
      return
    }

    try {
      setIsRejecting(true)
      await onReject(verification.id, rejectReason.trim())
      setShowRejectDialog(false)
      setRejectReason("")
    } catch (error) {
      console.error("Failed to reject verification", verification.id, error)
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{userName}</div>
                <div className="text-sm text-muted-foreground">{userEmail}</div>
              </div>
            </div>
            <Badge variant="outline" className={statusColors[verification.status]}>
              {verification.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{typeLabels[verification.type]}</span>
            </div>
            <Badge variant="secondary" className="text-xs capitalize">
              {verification.type}
            </Badge>
          </div>
          {(verification.firstName || verification.lastName) && (
            <div className="text-sm space-y-1">
              <p className="font-medium">
                {verification.firstName} {verification.lastName}
              </p>
              {verification.documentType && (
                <p className="text-xs text-muted-foreground">
                  {documentTypeLabels[verification.documentType] || verification.documentType}
                  {verification.documentNumber && ` — N° ${verification.documentNumber}`}
                </p>
              )}
              {verification.dateOfBirth && (
                <p className="text-xs text-muted-foreground">
                  Date de naissance: {new Date(verification.dateOfBirth).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Submitted {formatDateTime(verification.submittedAt)}
          </div>
          {attachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {attachments.slice(0, 3).map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1 text-xs font-medium"
                    onClick={() => setShowDetails(true)}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {attachment.label}
                  </button>
                ))}
                {attachments.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{attachments.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          {verification.rejectionReason && verification.status === "rejected" && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {verification.rejectionReason}
            </div>
          )}
          {latestHistoryEntry && (
            <div className="text-xs text-muted-foreground">
              Last action: <span className="font-medium capitalize">{latestHistoryEntry.action}</span> by{" "}
              <span className="font-medium">{latestHistoryEntry.actor}</span> (
              {formatDateTime(latestHistoryEntry.timestamp)})
            </div>
          )}
          <Button variant="outline" onClick={() => setShowDetails(true)} className="w-full bg-transparent">
            Review Request
          </Button>
        </CardContent>
        {verification.status === "pending" && (
          <CardFooter className="gap-2 pt-0">
            <Button onClick={handleApprove} className="flex-1" disabled={isApproving || isRejecting}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
              className="flex-1"
              disabled={isApproving || isRejecting}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl w-full h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">Review Verification</DialogTitle>
            <DialogDescription>
              {typeLabels[verification.type]} &middot; {userName} ({userEmail})
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
            <div className="space-y-5">
              {/* Metadata */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {verification.firstName && (
                  <>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="text-right font-medium">{verification.firstName} {verification.lastName}</dd>
                  </>
                )}
                {verification.dateOfBirth && (
                  <>
                    <dt className="text-muted-foreground">Date of Birth</dt>
                    <dd className="text-right font-medium">{new Date(verification.dateOfBirth).toLocaleDateString()}</dd>
                  </>
                )}
                {verification.documentType && (
                  <>
                    <dt className="text-muted-foreground">Document</dt>
                    <dd className="text-right font-medium">
                      {documentTypeLabels[verification.documentType] || verification.documentType}
                      {verification.documentNumber && ` — N° ${verification.documentNumber}`}
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-right font-medium">{formatDateTime(verification.submittedAt)}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-right">
                  <Badge variant="outline" className={`text-xs ${statusColors[verification.status]}`}>
                    {verification.status}
                  </Badge>
                </dd>
                {verification.reviewedBy && (
                  <>
                    <dt className="text-muted-foreground">Reviewed By</dt>
                    <dd className="text-right font-medium">{verification.reviewedBy}</dd>
                  </>
                )}
                {verification.reviewedAt && (
                  <>
                    <dt className="text-muted-foreground">Reviewed At</dt>
                    <dd className="text-right font-medium">{formatDateTime(verification.reviewedAt)}</dd>
                  </>
                )}
              </dl>

              {verification.rejectionReason && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {verification.rejectionReason}
                </div>
              )}

              <Separator />

              {/* Attachments as compact thumbnails */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Paperclip className="h-4 w-4" /> Attachments
                  <Badge variant="secondary" className="text-xs">{attachments.length}</Badge>
                </div>
                {attachments.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {attachments.map((attachment) => {
                      const visual = isImageAttachment(attachment.url, attachment.mimeType)
                      return (
                        <button
                          key={attachment.id}
                          type="button"
                          onClick={() => openAttachment(attachment.url)}
                          className="group block rounded-lg border border-border/60 overflow-hidden hover:border-primary/40 transition-colors text-left cursor-pointer w-full"
                        >
                          {visual ? (
                            <div className="aspect-square bg-muted">
                              <StorageImage
                                src={attachment.url}
                                alt={attachment.label}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-square bg-muted flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="px-2 py-1.5 text-xs font-medium truncate group-hover:text-primary transition-colors">
                            {attachment.label}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments provided.</p>
                )}
              </div>

              {/* History */}
              {history.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="h-4 w-4" /> History
                    </div>
                    <div className="space-y-2">
                      {history.map((entry) => (
                        <div key={entry.id} className="flex items-baseline justify-between text-sm">
                          <div>
                            <span className="font-medium capitalize">{entry.action}</span>
                            <span className="text-muted-foreground"> by {entry.actor}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 ml-4">{formatDateTime(entry.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Actions - sticky bottom */}
          <div className="border-t px-6 py-4">
            {verification.status === "pending" ? (
              <div className="flex gap-3">
                <Button onClick={handleApprove} className="flex-1" disabled={isApproving || isRejecting}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetails(false)
                    setShowRejectDialog(true)
                  }}
                  className="flex-1"
                  disabled={isApproving || isRejecting}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                This verification was {verification.status} on {formatDateTime(verification.reviewedAt)}.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRejectDialog}
        onOpenChange={(open) => {
          setShowRejectDialog(open)
          if (!open) {
            setRejectReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this verification request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Document is unclear, expired, or does not match requirements..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                className="flex-1"
                disabled={!rejectReason.trim() || isRejecting}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
