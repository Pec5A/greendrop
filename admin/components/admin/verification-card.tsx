"use client"

import { useState } from "react"
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
        <DialogContent className="max-w-4xl space-y-6">
          <DialogHeader>
            <DialogTitle>Review Verification</DialogTitle>
            <DialogDescription>
              {typeLabels[verification.type]} • {userName} ({userEmail})
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Paperclip className="h-4 w-4" /> Attachments
              </div>
              {attachments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {attachments.map((attachment) => {
                    const visual = isImageAttachment(attachment.url, attachment.mimeType)
                    return (
                      <div key={attachment.id} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>{attachment.label}</span>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-1 h-4 w-4" />
                              Open
                            </a>
                          </Button>
                        </div>
                        {visual ? (
                          <div className="mt-3 overflow-hidden rounded-md border bg-muted">
                            <StorageImage
                              src={attachment.url}
                              alt={attachment.label}
                              className="h-52 w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="mt-3 rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                            Preview not available
                          </div>
                        )}
                        <div className="mt-3 text-xs text-muted-foreground">
                          {attachment.mimeType || "Unknown type"}
                          {attachment.size ? ` • ${(attachment.size / 1024 / 1024).toFixed(2)} MB` : ""}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No attachments were provided for this request.
                </div>
              )}
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-lg border border-border/70 p-4 text-sm">
                <div className="text-sm font-semibold">Verification Metadata</div>
                <Separator className="my-3" />
                <dl className="space-y-2">
                  {verification.firstName && (
                    <div className="flex items-center justify-between text-xs">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-medium">
                        {verification.firstName} {verification.lastName}
                      </dd>
                    </div>
                  )}
                  {verification.dateOfBirth && (
                    <div className="flex items-center justify-between text-xs">
                      <dt className="text-muted-foreground">Date of Birth</dt>
                      <dd className="font-medium">{new Date(verification.dateOfBirth).toLocaleDateString()}</dd>
                    </div>
                  )}
                  {verification.documentType && (
                    <div className="flex items-center justify-between text-xs">
                      <dt className="text-muted-foreground">Document Type</dt>
                      <dd className="font-medium">
                        {documentTypeLabels[verification.documentType] || verification.documentType}
                      </dd>
                    </div>
                  )}
                  {verification.documentNumber && (
                    <div className="flex items-center justify-between text-xs">
                      <dt className="text-muted-foreground">Document N°</dt>
                      <dd className="font-medium">{verification.documentNumber}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <dt className="text-muted-foreground">Submitted</dt>
                    <dd className="font-medium">{formatDateTime(verification.submittedAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-semibold capitalize">{verification.status}</dd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <dt className="text-muted-foreground">Reviewed By</dt>
                    <dd className="font-medium">{verification.reviewedBy || "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <dt className="text-muted-foreground">Reviewed At</dt>
                    <dd className="font-medium">{formatDateTime(verification.reviewedAt)}</dd>
                  </div>
                </dl>
                {verification.rejectionReason && (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    {verification.rejectionReason}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" /> Review History
                </div>
                <Separator className="my-3" />
                {history.length > 0 ? (
                  <ScrollArea className="max-h-64 pr-2">
                    <div className="space-y-3">
                      {history.map((entry) => (
                        <div key={entry.id} className="rounded-md border border-border/60 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold capitalize">{entry.action}</span>
                            <span className="text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
                          </div>
                          <p className="mt-1 font-medium">{entry.actor}</p>
                          {entry.message && <p className="mt-1 text-muted-foreground">{entry.message}</p>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground">No history recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {verification.status === "pending" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
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
            <div className="rounded-md border border-border/70 bg-muted/50 p-3 text-sm">
              This verification was {verification.status} on {formatDateTime(verification.reviewedAt)}.
            </div>
          )}
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
