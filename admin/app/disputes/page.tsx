"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, DollarSign, User, Search, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useDisputes } from "@/hooks/use-disputes"
import { useToast } from "@/hooks/use-toast"
import type { Dispute } from "@/lib/types"

export default function DisputesPage() {
  const { disputes, loading, error, stats, resolveDispute } = useDisputes()
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [resolution, setResolution] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isResolving, setIsResolving] = useState(false)
  const { t } = useLanguage()
  const { toast } = useToast()

  useEffect(() => {
    setSelectedDispute((current) => {
      if (!current) return current
      return disputes.some((d) => d.id === current.id) ? current : null
    })
  }, [disputes])

  const getStatusColor = (status: string) => {
    const colors = {
      open: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      investigating: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      closed: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
    }
    return colors[status as keyof typeof colors] || colors.open
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      high: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.trim()) return
    try {
      setIsResolving(true)
      await resolveDispute(selectedDispute.id, resolution)
      toast({
        title: t("language") === "fr" ? "Litige résolu" : "Dispute resolved",
        description:
          t("language") === "fr"
            ? `Le litige ${selectedDispute.id} a été marqué comme résolu`
            : `Dispute ${selectedDispute.id} marked as resolved`,
      })
      setSelectedDispute(null)
      setResolution("")
    } catch (err) {
      console.error("Error resolving dispute", err)
      toast({
        title: t("language") === "fr" ? "Échec" : "Failed",
        description:
          t("language") === "fr"
            ? "Impossible de résoudre ce litige"
            : "Unable to resolve this dispute",
        variant: "destructive",
      })
    } finally {
      setIsResolving(false)
    }
  }

  const filteredDisputes = useMemo(() => {
    return disputes.filter(
      (d) =>
        d.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.reason.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [disputes, searchQuery])

  const openDisputes = useMemo(
    () => filteredDisputes.filter((d) => d.status === "open"),
    [filteredDisputes]
  )
  const investigatingDisputes = useMemo(
    () => filteredDisputes.filter((d) => d.status === "investigating"),
    [filteredDisputes]
  )
  const resolvedDisputes = useMemo(
    () => filteredDisputes.filter((d) => d.status === "resolved" || d.status === "closed"),
    [filteredDisputes]
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("disputes")}</h1>
          <p className="text-muted-foreground mt-1">{t("manageDisputes")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {t("language") === "fr" ? "Total Litiges" : "Total Disputes"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("open")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("inProgress")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.investigating}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("resolved")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.resolved + stats.closed}
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {t("language") === "fr" ? "Erreur lors du chargement des litiges" : "Failed to load disputes"}
            <span className="ml-2 text-xs text-destructive/80">{error.message}</span>
          </div>
        )}

        {loading && (
          <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("language") === "fr"
              ? "Chargement des litiges en cours..."
              : "Loading disputes from the database..."}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                t("language") === "fr"
                  ? "Rechercher par nom, commande, ou raison..."
                  : "Search by name, order, or reason..."
              }
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="open" className="space-y-4">
          <TabsList>
            <TabsTrigger value="open">
              {t("open")} ({openDisputes.length})
            </TabsTrigger>
            <TabsTrigger value="investigating">
              {t("inProgress")} ({investigatingDisputes.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              {t("resolved")} ({resolvedDisputes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-4">
            {openDisputes.map((dispute) => (
              <Card key={dispute.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-6" onClick={() => setSelectedDispute(dispute)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(dispute.status)}>
                          {dispute.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(dispute.priority)}>
                          {dispute.priority}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground">{dispute.orderId}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{dispute.reason}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{dispute.description}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {dispute.userName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(dispute.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />${dispute.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="bg-transparent">
                      Gérer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="investigating" className="space-y-4">
            {investigatingDisputes.map((dispute) => (
              <Card key={dispute.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-6" onClick={() => setSelectedDispute(dispute)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(dispute.status)}>
                          {dispute.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(dispute.priority)}>
                          {dispute.priority}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground">{dispute.orderId}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{dispute.reason}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{dispute.description}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {dispute.userName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(dispute.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />${dispute.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="bg-transparent">
                      Gérer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            {resolvedDisputes.map((dispute) => (
              <Card key={dispute.id} className="opacity-75">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(dispute.status)}>
                          {dispute.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(dispute.priority)}>
                          {dispute.priority}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground">{dispute.orderId}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{dispute.reason}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{dispute.description}</p>
                        {dispute.resolution && (
                          <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-sm text-foreground">
                              <strong>Résolution:</strong> {dispute.resolution}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Résolu par {dispute.resolvedBy} le{" "}
                              {dispute.resolvedAt && new Date(dispute.resolvedAt).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {dispute.userName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(dispute.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />${dispute.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Résoudre le Litige {selectedDispute?.id}</DialogTitle>
            <DialogDescription>Examinez les détails et résolvez le litige client</DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Client</span>
                  <span className="text-sm text-muted-foreground">{selectedDispute.userName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email</span>
                  <span className="text-sm text-muted-foreground">{selectedDispute.userEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Commande</span>
                  <span className="text-sm text-muted-foreground">{selectedDispute.orderId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Montant</span>
                  <span className="text-sm font-semibold">${selectedDispute.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Priorité</span>
                  <Badge variant="outline" className={getPriorityColor(selectedDispute.priority)}>
                    {selectedDispute.priority}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Raison du litige</h4>
                <p className="text-sm text-muted-foreground">{selectedDispute.reason}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedDispute.description}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type de résolution</label>
                <Select defaultValue="refund">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refund">Remboursement complet</SelectItem>
                    <SelectItem value="partial">Remboursement partiel</SelectItem>
                    <SelectItem value="replacement">Remplacement</SelectItem>
                    <SelectItem value="reject">Rejeter le litige</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes de résolution</label>
                <Textarea
                  placeholder="Expliquez comment ce litige a été résolu..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                  disabled={isResolving}
                />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleResolve} disabled={!resolution || isResolving}>
                  {isResolving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {isResolving ? "Résolution..." : "Résoudre le litige"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setSelectedDispute(null)}
                  disabled={isResolving}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
