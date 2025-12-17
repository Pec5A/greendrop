"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Mail, Ban, CheckCircle, Trash2, Download } from "lucide-react"

interface BulkActionsBarProps {
  selectedCount: number
  onClear: () => void
  onApprove?: () => void
  onReject?: () => void
  onDelete?: () => void
  onExport?: () => void
  onSendMessage?: () => void
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onApprove,
  onReject,
  onDelete,
  onExport,
  onSendMessage,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border border-primary/20 px-4 py-3 flex items-center gap-3">
        <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
          {selectedCount} selected
        </Badge>

        <div className="h-4 w-px bg-primary-foreground/20" />

        <div className="flex items-center gap-2">
          {onApprove && (
            <Button size="sm" variant="secondary" onClick={onApprove}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          )}
          {onReject && (
            <Button size="sm" variant="secondary" onClick={onReject}>
              <Ban className="mr-2 h-4 w-4" />
              Reject
            </Button>
          )}
          {onSendMessage && (
            <Button size="sm" variant="secondary" onClick={onSendMessage}>
              <Mail className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          )}
          {onExport && (
            <Button size="sm" variant="secondary" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>

        <div className="h-4 w-px bg-primary-foreground/20" />

        <Button size="sm" variant="ghost" onClick={onClear} className="hover:bg-primary-foreground/20">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
