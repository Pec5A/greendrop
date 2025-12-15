"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { VerificationCard } from "@/components/admin/verification-card"
import { BulkActionsBar } from "@/components/admin/bulk-actions-bar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { FileCheck, Download, Search as SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { exportToCSV } from "@/lib/utils/export"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { useVerifications } from "@/hooks/use-verifications"
import { useUsers } from "@/hooks/use-users"

export default function VerificationsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("pending")
  const [selectedVerifications, setSelectedVerifications] = useState<Set<string>>(new Set())
  const [userSearch, setUserSearch] = useState("")
  const { toast } = useToast()
  const { t } = useLanguage()

  const { verifications, loading, error, stats, approveVerification, rejectVerification } = useVerifications()
  const { users } = useUsers()

  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>()
    users.forEach((user) => map.set(user.id, { name: user.name, email: user.email }))
    return map
  }, [users])

  const filteredVerifications = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase()
    return verifications.filter((verification) => {
      if (activeTab !== "all" && verification.status !== activeTab) return false
      if (typeFilter !== "all" && verification.type !== typeFilter) return false
      if (normalizedSearch) {
        const userInfo = userMap.get(verification.userId)
        const haystack = `${userInfo?.name || ""} ${userInfo?.email || ""}`.toLowerCase()
        if (!haystack.includes(normalizedSearch)) return false
      }
      return true
    })
  }, [verifications, activeTab, typeFilter, userSearch, userMap])

  const getUserInfo = (userId: string) => {
    return userMap.get(userId) || { name: "Unknown User", email: "" }
  }

  useEffect(() => {
    setSelectedVerifications((prev) => {
      const next = new Set(Array.from(prev).filter((id) => verifications.some((v) => v.id === id)))
      return next
    })
  }, [verifications])

  const toggleVerificationSelection = (verificationId: string) => {
    const newSelection = new Set(selectedVerifications)
    if (newSelection.has(verificationId)) {
      newSelection.delete(verificationId)
    } else {
      newSelection.add(verificationId)
    }
    setSelectedVerifications(newSelection)
  }

  const handleApproveSingle = async (verificationId: string) => {
    try {
      await approveVerification(verificationId)
      toast({
        title: t("language") === "fr" ? "Vérification approuvée" : "Verification approved",
        description:
          t("language") === "fr"
            ? "Le statut a été mis à jour."
            : "Status updated successfully.",
      })
    } catch (err) {
      console.error("Error approving verification", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description:
          t("language") === "fr"
            ? "Impossible d'approuver cette vérification"
            : "Unable to approve this verification",
        variant: "destructive",
      })
      throw err
    }
  }

  const handleRejectSingle = async (verificationId: string, reason?: string) => {
    const trimmedReason = (reason || "").trim()
    if (!trimmedReason) {
      toast({
        title: t("language") === "fr" ? "Raison requise" : "Reason required",
        description:
          t("language") === "fr"
            ? "Veuillez indiquer la raison du rejet"
            : "Please provide a rejection reason before continuing",
        variant: "destructive",
      })
      return
    }

    try {
      await rejectVerification(verificationId, trimmedReason)
      toast({
        title: t("language") === "fr" ? "Vérification rejetée" : "Verification rejected",
        description:
          t("language") === "fr"
            ? "Le statut a été mis à jour."
            : "Status updated successfully.",
        variant: "destructive",
      })
    } catch (err) {
      console.error("Error rejecting verification", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description:
          t("language") === "fr"
            ? "Impossible de rejeter cette vérification"
            : "Unable to reject this verification",
        variant: "destructive",
      })
    }
  }

  const handleBulkApprove = async () => {
    if (selectedVerifications.size === 0) return
    try {
      await Promise.all(Array.from(selectedVerifications).map((id) => approveVerification(id)))
      toast({
        title: t("verificationsApproved"),
        description: `${selectedVerifications.size} ${t("verificationsSuccessfullyApproved")}`,
      })
      setSelectedVerifications(new Set())
    } catch (err) {
      console.error("Error approving verifications", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description:
          t("language") === "fr"
            ? "Impossible d'approuver les vérifications sélectionnées"
            : "Unable to approve selected verifications",
        variant: "destructive",
      })
    }
  }

  const handleBulkReject = async () => {
    if (selectedVerifications.size === 0) return
    try {
      await Promise.all(
        Array.from(selectedVerifications).map((id) =>
          rejectVerification(
            id,
            t("language") === "fr" ? "Rejeté via action groupée" : "Rejected via bulk action"
          )
        )
      )
      toast({
        title: t("verificationsRejected"),
        description: `${selectedVerifications.size} ${t("verificationsRejected")}`,
        variant: "destructive",
      })
      setSelectedVerifications(new Set())
    } catch (err) {
      console.error("Error rejecting verifications", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description:
          t("language") === "fr"
            ? "Impossible de rejeter les vérifications sélectionnées"
            : "Unable to reject selected verifications",
        variant: "destructive",
      })
    }
  }

  const handleBulkExport = () => {
    const selectedData = verifications.filter((v) => selectedVerifications.has(v.id))
    exportToCSV(selectedData, "verifications")
    toast({
      title: t("language") === "fr" ? "Export réussi" : "Export successful",
      description:
        t("language") === "fr"
          ? `${selectedData.length} vérifications exportées en CSV`
          : `Exported ${selectedData.length} verifications to CSV`,
    })
  }

  const pendingCount = stats.pending
  const approvedCount = stats.approved
  const rejectedCount = stats.rejected

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("verifications")}</h1>
          <p className="text-muted-foreground mt-1">{t("reviewDocuments")}</p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-80">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                t("language") === "fr"
                  ? "Rechercher par nom ou email..."
                  : "Search by user name or email..."
              }
              className="pl-9"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("documentType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                <SelectItem value="id">{t("governmentId")}</SelectItem>
                <SelectItem value="license">{t("driverLicense")}</SelectItem>
                <SelectItem value="business">{t("businessLicense")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportToCSV(filteredVerifications, "verifications")}>
              <Download className="mr-2 h-4 w-4" />
              {t("export")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {t("language") === "fr"
              ? "Erreur lors du chargement des vérifications"
              : "Failed to load verifications"}
            <span className="ml-2 text-xs text-destructive/80">{error.message}</span>
          </div>
        )}

        {loading && (
          <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("language") === "fr"
              ? "Chargement des vérifications en cours..."
              : "Loading verifications from the database..."}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              {t("pending")}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              {t("approved")}
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {approvedCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              {t("rejected")}
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {rejectedCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all">{t("all")}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredVerifications.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredVerifications.map((verification) => {
                  const userInfo = getUserInfo(verification.userId)
                  return (
                    <div key={verification.id} className="relative">
                      {verification.status === "pending" && (
                        <Checkbox
                          className="absolute top-4 right-4 z-10"
                          checked={selectedVerifications.has(verification.id)}
                          onCheckedChange={() => toggleVerificationSelection(verification.id)}
                        />
                      )}
                      <VerificationCard
                        verification={verification}
                        userName={userInfo.name}
                        userEmail={userInfo.email}
                        onApprove={() => handleApproveSingle(verification.id)}
                        onReject={(id, reason) => handleRejectSingle(id, reason)}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-12">
                <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("noVerificationsFound")}</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {t("language") === "fr"
                    ? `Aucune vérification ${activeTab !== "all" ? activeTab : ""} à afficher.`
                    : `There are no ${activeTab !== "all" ? activeTab : ""} verifications to display.`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BulkActionsBar
        selectedCount={selectedVerifications.size}
        onClear={() => setSelectedVerifications(new Set())}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        onExport={handleBulkExport}
      />
    </AdminLayout>
  )
}
