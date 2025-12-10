"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { DataTable } from "@/components/admin/data-table"
import { EntityModal } from "@/components/admin/entity-modal"
import { OrderDetail } from "@/components/admin/order-detail"
import { BulkActionsBar } from "@/components/admin/bulk-actions-bar"
import {
  UpdateOrderStatusModal,
  ContactCustomerModal,
  CancelOrderModal,
  AssignDriverModal,
} from "@/components/admin/action-modals"
import { KPICard } from "@/components/admin/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Clock3, Download, MoreHorizontal, Package, Truck, UserCheck } from "lucide-react"
import { exportToCSV } from "@/lib/utils/export"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import type { Driver, Order } from "@/lib/types"
import { useOrders } from "@/hooks/use-orders"
import { useUsers } from "@/hooks/use-users"
import { useDrivers } from "@/hooks/use-drivers"

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const { t } = useLanguage()
  const isFrench = t("language") === "fr"

  const [updateStatusOrder, setUpdateStatusOrder] = useState<Order | null>(null)
  const [contactCustomerOrder, setContactCustomerOrder] = useState<Order | null>(null)
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null)
  const [assignDriverOrder, setAssignDriverOrder] = useState<Order | null>(null)
  const { orders, loading, error, stats, updateOrderStatus, assignDriver } = useOrders()
  const { users } = useUsers()
  const { drivers, stats: driverStats } = useDrivers()

  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; email?: string }>()
    users.forEach((user) => {
      map.set(user.id, { name: user.name, email: user.email })
    })
    return map
  }, [users])

  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>()
    drivers.forEach((driver) => map.set(driver.id, driver))
    return map
  }, [drivers])

  const driverOptions = useMemo(
    () =>
      drivers.map((driver) => ({
        id: driver.id,
        name: driver.name,
        status: driver.status,
        vehicleType: driver.vehicleType,
        currentOrderId: driver.currentOrderId ?? null,
      })),
    [drivers],
  )

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false
      return true
    })
  }, [orders, statusFilter])

  const getUserInfo = (userId: string) => {
    return userMap.get(userId) || { name: "Unknown User", email: "" }
  }

  useEffect(() => {
    setSelectedOrders((prev) => {
      const next = new Set(Array.from(prev).filter((id) => orders.some((order) => order.id === id)))
      return next
    })
  }, [orders])

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders)
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId)
    } else {
      newSelection.add(orderId)
    }
    setSelectedOrders(newSelection)
  }

  const toggleAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)))
    }
  }

  const handleBulkExport = () => {
    const selectedData = orders.filter((o) => selectedOrders.has(o.id))
    exportToCSV(selectedData, "orders")
    toast({
      title: t("language") === "fr" ? "Export réussi" : "Export successful",
      description:
        t("language") === "fr"
          ? `${selectedData.length} commandes exportées en CSV`
          : `Exported ${selectedData.length} orders to CSV`,
    })
  }

  const handleBulkSendMessage = () => {
    toast({
      title: t("language") === "fr" ? "Messages mis en file" : "Messages queued",
      description:
        t("language") === "fr"
          ? `Envoi de mises à jour à ${selectedOrders.size} clients`
          : `Sending updates to ${selectedOrders.size} customers`,
    })
    setSelectedOrders(new Set())
  }

  const statusColors = {
    created: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
    paid: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    shipped: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  }

  const priorityClasses: Record<NonNullable<Order["priority"]>, string> = {
    low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    normal: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    urgent: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  }

  const driverStatusLabels: Record<Driver["status"], string> = {
    online: isFrench ? "En ligne" : "Online",
    offline: isFrench ? "Hors ligne" : "Offline",
    busy: isFrench ? "Occupé" : "Busy",
    break: isFrench ? "En pause" : "On break",
  }

  const getPriorityLabel = (priority: Order["priority"] = "normal") => {
    switch (priority) {
      case "low":
        return isFrench ? "Basse" : "Low"
      case "high":
        return isFrench ? "Haute" : "High"
      case "urgent":
        return isFrench ? "Urgente" : "Urgent"
      default:
        return isFrench ? "Normale" : "Normal"
    }
  }

  const formatDelivery = (dateString?: string | null) => {
    if (!dateString) return isFrench ? "Non planifié" : "Not scheduled"
    return new Date(dateString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOrderDelayed = (order: Order) => {
    if (!order.expectedDelivery) return false
    if (order.status === "delivered" || order.status === "cancelled") return false
    return new Date(order.expectedDelivery).getTime() < Date.now()
  }

  const dispatchColumns: Array<{ status: Order["status"]; title: string; description: string }> = [
    {
      status: "created",
      title: isFrench ? "À confirmer" : "Awaiting confirmation",
      description: isFrench ? "Nouvelles commandes en file" : "Newly created orders",
    },
    {
      status: "paid",
      title: isFrench ? "Prêtes à expédier" : "Ready to ship",
      description: isFrench ? "Assignez un chauffeur" : "Assign a driver",
    },
    {
      status: "shipped",
      title: isFrench ? "En transit" : "In transit",
      description: isFrench ? "Suivez la progression" : "Track active deliveries",
    },
    {
      status: "delivered",
      title: isFrench ? "Livrées" : "Delivered",
      description: isFrench ? "À clôturer" : "Completed today",
    },
  ]

  const columns = [
    {
      key: "select",
      label: (
        <Checkbox
          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
          onCheckedChange={toggleAllOrders}
        />
      ),
      render: (order: Order) => (
        <Checkbox checked={selectedOrders.has(order.id)} onCheckedChange={() => toggleOrderSelection(order.id)} />
      ),
    },
    {
      key: "id",
      label: t("language") === "fr" ? "ID Commande" : "Order ID",
      render: (order: Order) => <span className="font-mono text-sm font-medium">{order.id}</span>,
    },
    {
      key: "user",
      label: t("customer"),
      render: (order: Order) => <span className="text-sm">{getUserInfo(order.userId).name}</span>,
    },
    {
      key: "status",
      label: t("status"),
      render: (order: Order) => (
        <Badge variant="outline" className={statusColors[order.status]}>
          {t(order.status)}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: isFrench ? "Priorité" : "Priority",
      render: (order: Order) => (
        <Badge variant="outline" className={priorityClasses[order.priority ?? "normal"]}>
          {getPriorityLabel(order.priority)}
        </Badge>
      ),
    },
    {
      key: "items",
      label: t("language") === "fr" ? "Articles" : "Items",
      render: (order: Order) => (
        <span className="text-sm text-muted-foreground">
          {order.items.length} {t("language") === "fr" ? "articles" : "items"}
        </span>
      ),
    },
    {
      key: "total",
      label: t("language") === "fr" ? "Total" : "Total",
      render: (order: Order) => <span className="text-sm font-medium">${order.total.toFixed(2)}</span>,
    },
    {
      key: "delivery",
      label: isFrench ? "Livraison" : "Delivery",
      render: (order: Order) => (
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-medium">{formatDelivery(order.expectedDelivery)}</span>
          {isOrderDelayed(order) && (
            <Badge variant="destructive" className="w-fit text-[10px]">
              {isFrench ? "En retard" : "Delayed"}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "driver",
      label: isFrench ? "Chauffeur" : "Driver",
      render: (order: Order) => {
        const driver = order.driverId ? driverMap.get(order.driverId) : undefined
        return (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-sm font-medium">
              {driver?.name ?? (isFrench ? "Non assigné" : "Unassigned")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {driver && (
                <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-wide">
                  {driverStatusLabels[driver.status]}
                </Badge>
              )}
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                onClick={() => setAssignDriverOrder(order)}
                disabled={order.status === "delivered" || order.status === "cancelled"}
              >
                {driver
                  ? isFrench
                    ? "Réassigner"
                    : "Reassign"
                  : isFrench
                    ? "Assigner"
                    : "Assign driver"}
              </Button>
            </div>
          </div>
        )
      },
    },
    {
      key: "createdAt",
      label: t("date"),
      render: (order: Order) => (
        <span className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: "actions",
      label: t("actions"),
      render: (order: Order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
              {t("language") === "fr" ? "Voir Détails" : "View Details"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUpdateStatusOrder(order)}>{t("updateStatus")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setContactCustomerOrder(order)}>{t("contactCustomer")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAssignDriverOrder(order)}>
              {order.driverId
                ? isFrench
                  ? "Réassigner un chauffeur"
                  : "Reassign driver"
                : isFrench
                  ? "Assigner un chauffeur"
                  : "Assign driver"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setCancelOrder(order)}>
              {t("cancelOrder")}
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
            <h1 className="text-3xl font-bold tracking-tight">{t("orders")}</h1>
            <p className="text-muted-foreground mt-1">{t("trackOrders")}</p>
          </div>
          <Button variant="outline" onClick={() => exportToCSV(filteredOrders, "orders")}>
            <Download className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KPICard
            title={isFrench ? "En attente d'expédition" : "Pending shipment"}
            value={stats.pendingShipment.toLocaleString()}
            icon={<Package className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "Livrées aujourd'hui" : "Delivered today"}
            value={stats.deliveredToday.toLocaleString()}
            icon={<Truck className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "Commandes en retard" : "Delayed orders"}
            value={stats.delayedOrders.toLocaleString()}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "Taux à l'heure" : "On-time rate"}
            value={`${stats.onTimeRate}%`}
            icon={<Clock3 className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "Chauffeurs actifs" : "Active drivers"}
            value={(driverStats.online ?? 0).toLocaleString()}
            icon={<UserCheck className="h-4 w-4" />}
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {t("language") === "fr" ? "Erreur lors du chargement des commandes" : "Failed to load orders"}
            <span className="ml-2 text-xs text-destructive/80">{error.message}</span>
          </div>
        )}

        {loading && (
          <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("language") === "fr"
              ? "Chargement des commandes en cours..."
              : "Loading orders from the database..."}
          </div>
        )}

        <Tabs defaultValue="table" className="space-y-4">
          <TabsList className="w-fit">
            <TabsTrigger value="table">{isFrench ? "Vue tableur" : "Table view"}</TabsTrigger>
            <TabsTrigger value="dispatch">{isFrench ? "Dispatch" : "Dispatch board"}</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="space-y-4">
            <DataTable
              data={filteredOrders}
              columns={columns}
              searchPlaceholder={
                isFrench ? "Rechercher par ID ou client..." : "Search orders by ID or customer..."
              }
              filterComponent={
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allOrders")}</SelectItem>
                    <SelectItem value="created">{isFrench ? "Créé" : "Created"}</SelectItem>
                    <SelectItem value="paid">{isFrench ? "Payé" : "Paid"}</SelectItem>
                    <SelectItem value="shipped">{t("shipped")}</SelectItem>
                    <SelectItem value="delivered">{t("delivered")}</SelectItem>
                    <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </TabsContent>
          <TabsContent value="dispatch" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dispatchColumns.map((column) => {
                const columnOrders = orders.filter((order) => order.status === column.status)
                return (
                  <div key={column.status} className="flex flex-col rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{column.title}</p>
                          <p className="text-xs text-muted-foreground">{column.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {columnOrders.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 p-4">
                      {columnOrders.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                          {isFrench ? "Aucune commande" : "No orders"}
                        </div>
                      ) : (
                        columnOrders.map((order) => {
                          const driver = order.driverId ? driverMap.get(order.driverId) : undefined
                          const delayed = isOrderDelayed(order)
                          return (
                            <div key={order.id} className="rounded-lg border bg-muted/40 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold">
                                    {order.reference ?? `#${order.id.slice(-6).toUpperCase()}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{getUserInfo(order.userId).name}</p>
                                </div>
                                <Badge variant="outline" className={priorityClasses[order.priority ?? "normal"]}>
                                  {getPriorityLabel(order.priority)}
                                </Badge>
                              </div>
                              <div className="mt-3 flex flex-col gap-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    {isFrench ? "Livraison" : "Delivery"}
                                  </span>
                                  <span className="font-medium">{formatDelivery(order.expectedDelivery)}</span>
                                </div>
                                {delayed && (
                                  <Badge variant="destructive" className="w-fit text-[11px]">
                                    {isFrench ? "En retard" : "Delayed"}
                                  </Badge>
                                )}
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground">
                                    {isFrench ? "Chauffeur" : "Driver"}
                                  </span>
                                  {driver ? (
                                    <p className="text-xs font-medium">
                                      {driver.name} · {driverStatusLabels[driver.status]}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      {isFrench ? "Non assigné" : "Unassigned"}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                                  {isFrench ? "Détails" : "Details"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setAssignDriverOrder(order)}
                                  disabled={order.status === "delivered" || order.status === "cancelled"}
                                >
                                  {driver
                                    ? isFrench
                                      ? "Réassigner"
                                      : "Reassign"
                                    : isFrench
                                      ? "Assigner"
                                      : "Assign driver"}
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BulkActionsBar
        selectedCount={selectedOrders.size}
        onClear={() => setSelectedOrders(new Set())}
        onExport={handleBulkExport}
        onSendMessage={handleBulkSendMessage}
      />

      <EntityModal
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        title="Détails de la Commande"
        description="Voir le timeline et gérer le statut de la commande"
        size="lg"
      >
        {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </EntityModal>

      {updateStatusOrder && (
        <UpdateOrderStatusModal
          isOpen={!!updateStatusOrder}
          onClose={() => setUpdateStatusOrder(null)}
          orderId={updateStatusOrder.id}
          currentStatus={updateStatusOrder.status}
          onSuccess={async (newStatus) => {
            await updateOrderStatus(updateStatusOrder.id, newStatus as Order["status"])
            setUpdateStatusOrder(null)
          }}
        />
      )}

      {contactCustomerOrder && (
        <ContactCustomerModal
          isOpen={!!contactCustomerOrder}
          onClose={() => setContactCustomerOrder(null)}
          orderId={contactCustomerOrder.id}
          customerName={getUserInfo(contactCustomerOrder.userId).name}
          customerEmail={getUserInfo(contactCustomerOrder.userId).email || "customer@example.com"}
        />
      )}

      {cancelOrder && (
        <CancelOrderModal
          isOpen={!!cancelOrder}
          onClose={() => setCancelOrder(null)}
          orderId={cancelOrder.id}
          onSuccess={async () => {
            await updateOrderStatus(cancelOrder.id, "cancelled")
            setCancelOrder(null)
          }}
        />
      )}

      {assignDriverOrder && (
        <AssignDriverModal
          isOpen={!!assignDriverOrder}
          onClose={() => setAssignDriverOrder(null)}
          orderId={assignDriverOrder.id}
          drivers={driverOptions}
          onAssign={async (driverId: string) => {
            if (!assignDriverOrder) return
            const driver = drivers.find((d) => d.id === driverId)
            if (!driver) {
              throw new Error("Driver not found")
            }
            await assignDriver(assignDriverOrder.id, {
              id: driver.id,
              name: driver.name,
              phone: driver.phone,
            })
          }}
        />
      )}
    </AdminLayout>
  )
}
