"use client"

import { useEffect, useMemo, useState } from "react"
import type { MerchantStatus, Product, Shop } from "@/lib/types"
import { AdminLayout } from "@/components/admin/admin-layout"
import { KPICard } from "@/components/admin/kpi-card"
import { DataTable } from "@/components/admin/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProducts } from "@/hooks/use-products"
import { useMerchants } from "@/hooks/use-merchants"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, CheckCircle2, Package, PenSquare, PlusCircle, Store, Trash2 } from "lucide-react"

interface ProductFormValues {
  name: string
  description: string
  sku: string
  category: string
  price: number
  stock: number
  minStock?: number
  status: Product["status"]
  shopId: string
  imageUrl?: string
}

interface MerchantFormValues {
  name: string
  ownerName: string
  ownerId: string
  status: MerchantStatus
  address: string
  contactEmail?: string
  contactPhone?: string
  categories: string[]
}

type ProductFormState = {
  name: string
  description: string
  sku: string
  category: string
  price: string
  stock: string
  minStock: string
  status: Product["status"]
  shopId: string
  imageUrl: string
}

type MerchantFormState = {
  name: string
  ownerName: string
  ownerId: string
  status: MerchantStatus
  address: string
  contactEmail: string
  contactPhone: string
  categories: string
}

const productStatusColors: Record<Product["status"], string> = {
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  inactive: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  archived: "bg-slate-400/10 text-slate-500 border-slate-400/30",
  out_of_stock: "bg-red-500/10 text-red-600 border-red-500/20",
}

const merchantStatusColors: Record<MerchantStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  suspended: "bg-red-500/10 text-red-600 border-red-500/20",
}

export default function CatalogPage() {
  const { products, stats: productStats, loading: productsLoading, error: productsError, createProduct, updateProduct, deleteProduct } =
    useProducts()
  const {
    merchants,
    stats: merchantStats,
    loading: merchantsLoading,
    error: merchantsError,
    createMerchant,
    updateMerchant,
  } = useMerchants()
  const { t } = useLanguage()
  const { toast } = useToast()
  const isFrench = t("language") === "fr"

  const [productSearch, setProductSearch] = useState("")
  const [productStatusFilter, setProductStatusFilter] = useState<string>("all")
  const [merchantSearch, setMerchantSearch] = useState("")
  const [merchantStatusFilter, setMerchantStatusFilter] = useState<string>("all")
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [merchantModalOpen, setMerchantModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingMerchant, setEditingMerchant] = useState<Shop | null>(null)
  const [productSubmitting, setProductSubmitting] = useState(false)
  const [merchantSubmitting, setMerchantSubmitting] = useState(false)

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase()
    return products.filter((product) => {
      const matchesQuery =
        query.length === 0 ||
        [product.name, product.sku, product.category, product.shopName]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      const matchesStatus = productStatusFilter === "all" || product.status === productStatusFilter
      return matchesQuery && matchesStatus
    })
  }, [products, productSearch, productStatusFilter])

  const filteredMerchants = useMemo(() => {
    const query = merchantSearch.trim().toLowerCase()
    return merchants.filter((merchant) => {
      const matchesQuery =
        query.length === 0 ||
        [merchant.name, merchant.ownerName, merchant.address, merchant.contactEmail]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      const matchesStatus = merchantStatusFilter === "all" || merchant.status === merchantStatusFilter
      return matchesQuery && matchesStatus
    })
  }, [merchants, merchantSearch, merchantStatusFilter])

  const handleSaveProduct = async (values: ProductFormValues) => {
    try {
      setProductSubmitting(true)
      const merchant = merchants.find((m) => m.id === values.shopId)
      if (!merchant) {
        throw new Error(isFrench ? "Marchand introuvable" : "Merchant not found")
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          ...values,
          shopName: merchant.name,
        })
        toast({
          title: isFrench ? "Produit mis à jour" : "Product updated",
          description: editingProduct.name,
        })
      } else {
        await createProduct({
          ...values,
          shopName: merchant.name,
          tags: values.category ? [values.category] : [],
          featured: false,
        })
        toast({
          title: isFrench ? "Produit ajouté" : "Product created",
          description: values.name,
        })
      }
      setProductModalOpen(false)
      setEditingProduct(null)
    } catch (error) {
      console.error("Error saving product", error)
      toast({
        title: isFrench ? "Erreur produit" : "Product error",
        description: (error as Error).message ?? (isFrench ? "Impossible d'enregistrer" : "Unable to save product"),
        variant: "destructive",
      })
    } finally {
      setProductSubmitting(false)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    const confirmLabel = isFrench ? "Supprimer ce produit ?" : "Delete this product?"
    if (!window.confirm(confirmLabel)) return
    try {
      await deleteProduct(product.id)
      toast({
        title: isFrench ? "Produit supprimé" : "Product deleted",
        description: product.name,
      })
    } catch (error) {
      console.error("Error deleting product", error)
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench ? "Suppression impossible" : "Unable to delete product",
        variant: "destructive",
      })
    }
  }

  const handleSaveMerchant = async (values: MerchantFormValues) => {
    try {
      setMerchantSubmitting(true)
      if (editingMerchant) {
        await updateMerchant(editingMerchant.id, {
          ...values,
          categories: values.categories,
        })
        toast({
          title: isFrench ? "Marchand mis à jour" : "Merchant updated",
          description: values.name,
        })
      } else {
        await createMerchant({
          ...values,
          logoUrl: undefined,
        })
        toast({
          title: isFrench ? "Marchand créé" : "Merchant created",
          description: values.name,
        })
      }
      setMerchantModalOpen(false)
      setEditingMerchant(null)
    } catch (error) {
      console.error("Error saving merchant", error)
      toast({
        title: isFrench ? "Erreur marchand" : "Merchant error",
        description: (error as Error).message ?? (isFrench ? "Impossible d'enregistrer" : "Unable to save merchant"),
        variant: "destructive",
      })
    } finally {
      setMerchantSubmitting(false)
    }
  }

  const productColumns = [
    {
      key: "name",
      label: isFrench ? "Produit" : "Product",
      render: (product: Product) => (
        <div className="space-y-1">
          <p className="text-sm font-semibold">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {product.category} · {product.sku}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      label: isFrench ? "Prix" : "Price",
      render: (product: Product) => <span className="text-sm font-medium">${product.price.toFixed(2)}</span>,
    },
    {
      key: "stock",
      label: isFrench ? "Stock" : "Stock",
      render: (product: Product) => {
        const threshold = typeof product.minStock === "number" ? product.minStock : 5
        const isOut = product.status === "out_of_stock" || product.stock === 0
        const isLow = !isOut && product.stock <= threshold
        return (
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{product.stock}</span>
            {isOut && (
              <Badge variant="destructive" className="w-fit text-[10px]">
                {isFrench ? "Rupture" : "Out"}
              </Badge>
            )}
            {isLow && (
              <Badge variant="outline" className="w-fit text-[10px] text-amber-600 border-amber-500/40">
                {isFrench ? "Faible" : "Low"}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: "status",
      label: t("status"),
      render: (product: Product) => (
        <Badge variant="outline" className={productStatusColors[product.status]}>
          {product.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "merchant",
      label: isFrench ? "Marchand" : "Merchant",
      render: (product: Product) => (
        <div className="text-sm">
          <p className="font-medium">{product.shopName || "—"}</p>
          <p className="text-xs text-muted-foreground">{product.shopId}</p>
        </div>
      ),
    },
    {
      key: "actions",
      label: t("actions"),
      render: (product: Product) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent"
            onClick={() => {
              setEditingProduct(product)
              setProductModalOpen(true)
            }}
          >
            <PenSquare className="mr-1.5 h-3.5 w-3.5" />
            {isFrench ? "Modifier" : "Edit"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {isFrench ? "Supprimer" : "Delete"}
          </Button>
        </div>
      ),
    },
  ]

  const merchantColumns = [
    {
      key: "name",
      label: isFrench ? "Marchand" : "Merchant",
      render: (merchant: Shop) => (
        <div className="space-y-1">
          <p className="text-sm font-semibold">{merchant.name}</p>
          <p className="text-xs text-muted-foreground">{merchant.ownerName ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: t("status"),
      render: (merchant: Shop) => (
        <Badge variant="outline" className={merchantStatusColors[merchant.status]}>
          {merchant.status}
        </Badge>
      ),
    },
    {
      key: "volume",
      label: isFrench ? "Volume" : "Volume",
      render: (merchant: Shop) => (
        <div className="text-sm">
          <p className="font-medium">{merchant.totalOrders ?? 0} {isFrench ? "commandes" : "orders"}</p>
          <p className="text-xs text-muted-foreground">{merchant.totalProducts ?? 0} sku</p>
        </div>
      ),
    },
    {
      key: "contact",
      label: isFrench ? "Contact" : "Contact",
      render: (merchant: Shop) => (
        <div className="text-xs text-muted-foreground">
          {merchant.contactEmail || "—"}
          <div>{merchant.contactPhone || "—"}</div>
        </div>
      ),
    },
    {
      key: "actions",
      label: t("actions"),
      render: (merchant: Shop) => (
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent"
          onClick={() => {
            setEditingMerchant(merchant)
            setMerchantModalOpen(true)
          }}
        >
          <PenSquare className="mr-1.5 h-3.5 w-3.5" />
          {isFrench ? "Modifier" : "Edit"}
        </Button>
      ),
    },
  ]

  const disableProductCreation = merchants.length === 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("catalog")}</h1>
            <p className="text-muted-foreground mt-1">{t("catalogOverview")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                if (disableProductCreation) {
                  toast({
                    title: isFrench ? "Ajoutez un marchand" : "Add a merchant first",
                    description: isFrench
                      ? "Créez un marchand avant d'ajouter un produit"
                      : "Create at least one merchant before adding products",
                    variant: "destructive",
                  })
                  return
                }
                setEditingProduct(null)
                setProductModalOpen(true)
              }}
              disabled={disableProductCreation}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("addProduct")}
            </Button>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                setEditingMerchant(null)
                setMerchantModalOpen(true)
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("addMerchant")}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard title={isFrench ? "Produits" : "Products"} value={productStats.total.toLocaleString()} icon={<Package className="h-4 w-4" />} />
          <KPICard title={isFrench ? "Actifs" : "Active"} value={productStats.active.toLocaleString()} icon={<CheckCircle2 className="h-4 w-4" />} />
          <KPICard
            title={isFrench ? "Stock faible" : "Low stock"}
            value={productStats.lowStock.toLocaleString()}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <KPICard
            title={isFrench ? "Marchands actifs" : "Active merchants"}
            value={(merchantStats.active ?? 0).toLocaleString()}
            icon={<Store className="h-4 w-4" />}
          />
        </div>

        {(productsError || merchantsError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {productsError?.message || merchantsError?.message}
          </div>
        )}

        {(productsLoading || merchantsLoading) && (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
            {isFrench ? "Chargement des données catalogue..." : "Loading catalog data..."}
          </div>
        )}

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">{t("products")}</TabsTrigger>
            <TabsTrigger value="merchants">{t("merchants")}</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <DataTable
              data={filteredProducts}
              columns={productColumns}
              searchPlaceholder={isFrench ? "Rechercher un produit..." : "Search products..."}
              onSearch={setProductSearch}
              filterComponent={
                <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allOrders")}</SelectItem>
                    <SelectItem value="active">{isFrench ? "Actif" : "Active"}</SelectItem>
                    <SelectItem value="draft">{isFrench ? "Brouillon" : "Draft"}</SelectItem>
                    <SelectItem value="inactive">{isFrench ? "Inactif" : "Inactive"}</SelectItem>
                    <SelectItem value="out_of_stock">{isFrench ? "Rupture" : "Out of stock"}</SelectItem>
                    <SelectItem value="archived">{isFrench ? "Archivé" : "Archived"}</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </TabsContent>

          <TabsContent value="merchants" className="space-y-4">
            <DataTable
              data={filteredMerchants}
              columns={merchantColumns}
              searchPlaceholder={isFrench ? "Rechercher un marchand..." : "Search merchants..."}
              onSearch={setMerchantSearch}
              filterComponent={
                <Select value={merchantStatusFilter} onValueChange={setMerchantStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allOrders")}</SelectItem>
                    <SelectItem value="active">{isFrench ? "Actif" : "Active"}</SelectItem>
                    <SelectItem value="pending">{isFrench ? "En attente" : "Pending"}</SelectItem>
                    <SelectItem value="inactive">{isFrench ? "Inactif" : "Inactive"}</SelectItem>
                    <SelectItem value="suspended">{isFrench ? "Suspendu" : "Suspended"}</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <ProductFormDialog
        open={productModalOpen}
        onOpenChange={(open) => {
          setProductModalOpen(open)
          if (!open) setEditingProduct(null)
        }}
        merchants={merchants}
        initialProduct={editingProduct}
        onSubmit={handleSaveProduct}
        isSubmitting={productSubmitting}
      />

      <MerchantFormDialog
        open={merchantModalOpen}
        onOpenChange={(open) => {
          setMerchantModalOpen(open)
          if (!open) setEditingMerchant(null)
        }}
        initialMerchant={editingMerchant}
        onSubmit={handleSaveMerchant}
        isSubmitting={merchantSubmitting}
      />
    </AdminLayout>
  )
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchants: Shop[]
  initialProduct: Product | null
  onSubmit: (values: ProductFormValues) => Promise<void>
  isSubmitting: boolean
}

function ProductFormDialog({ open, onOpenChange, merchants, initialProduct, onSubmit, isSubmitting }: ProductFormDialogProps) {
  const { t } = useLanguage()
  const isFrench = t("language") === "fr"
  const [formState, setFormState] = useState<ProductFormState>(() => createProductFormState(initialProduct, merchants))

  useEffect(() => {
    if (open) {
      setFormState(createProductFormState(initialProduct, merchants))
    }
  }, [initialProduct, merchants, open])

  const resetState = () => setFormState(createProductFormState(null, merchants))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const price = Number(formState.price)
    const stock = Number(formState.stock)
    const parsedMinStock = formState.minStock !== "" ? Number(formState.minStock) : undefined

    await onSubmit({
      name: formState.name.trim(),
      description: formState.description.trim(),
      sku: formState.sku.trim(),
      category: formState.category.trim() || "general",
      price: Number.isFinite(price) ? price : 0,
      stock: Number.isFinite(stock) ? stock : 0,
      minStock: typeof parsedMinStock === "number" && Number.isFinite(parsedMinStock) ? parsedMinStock : undefined,
      status: formState.status as Product["status"],
      shopId: formState.shopId,
      imageUrl: formState.imageUrl.trim() || undefined,
    })
    resetState()
  }

  const modalTitle = initialProduct ? (isFrench ? "Modifier le produit" : "Edit product") : t("addProduct")

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) resetState()
      onOpenChange(nextOpen)
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {isFrench ? "Gérez les informations du catalogue" : "Manage catalog information"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isFrench ? "Nom" : "Name"}</Label>
              <Input value={formState.name} onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={formState.sku} onChange={(e) => setFormState((prev) => ({ ...prev, sku: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "Prix" : "Price"}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formState.price}
                onChange={(e) => setFormState((prev) => ({ ...prev, price: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "Stock" : "Stock"}</Label>
              <Input
                type="number"
                min="0"
                value={formState.stock}
                onChange={(e) => setFormState((prev) => ({ ...prev, stock: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "Stock minimal" : "Safety stock"}</Label>
              <Input
                type="number"
                min="0"
                value={formState.minStock}
                onChange={(e) => setFormState((prev) => ({ ...prev, minStock: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "Catégorie" : "Category"}</Label>
              <Input value={formState.category} onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("status")}</Label>
              <Select value={formState.status} onValueChange={(value: ProductFormState["status"]) => setFormState((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{isFrench ? "Brouillon" : "Draft"}</SelectItem>
                  <SelectItem value="active">{isFrench ? "Actif" : "Active"}</SelectItem>
                  <SelectItem value="inactive">{isFrench ? "Inactif" : "Inactive"}</SelectItem>
                  <SelectItem value="out_of_stock">{isFrench ? "Rupture" : "Out of stock"}</SelectItem>
                  <SelectItem value="archived">{isFrench ? "Archivé" : "Archived"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "Marchand" : "Merchant"}</Label>
              <Select value={formState.shopId} onValueChange={(value) => setFormState((prev) => ({ ...prev, shopId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isFrench ? "Choisir" : "Choose"} />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((merchant) => (  
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isFrench ? "Image" : "Image URL"}</Label>
            <Input value={formState.imageUrl} onChange={(e) => setFormState((prev) => ({ ...prev, imageUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{isFrench ? "Description" : "Description"}</Label>
            <Textarea
              rows={4}
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || merchants.length === 0}>
              {isSubmitting ? (isFrench ? "Enregistrement..." : "Saving...") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const createProductFormState = (product: Product | null, merchants: Shop[]): ProductFormState => ({
  name: product?.name ?? "",
  description: product?.description ?? "",
  sku: product?.sku ?? "",
  category: product?.category ?? "",
  price: product ? String(product.price) : "",
  stock: product ? String(product.stock) : "",
  minStock: product && typeof product.minStock === "number" ? String(product.minStock) : "",
  status: product?.status ?? "draft",
  shopId: product?.shopId ?? merchants[0]?.id ?? "",
  imageUrl: product?.imageUrl ?? "",
})

interface MerchantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMerchant: Shop | null
  onSubmit: (values: MerchantFormValues) => Promise<void>
  isSubmitting: boolean
}

function MerchantFormDialog({ open, onOpenChange, initialMerchant, onSubmit, isSubmitting }: MerchantFormDialogProps) {
  const { t } = useLanguage()
  const isFrench = t("language") === "fr"
  const [formState, setFormState] = useState<MerchantFormState>(() => createMerchantFormState(initialMerchant))

  useEffect(() => {
    if (open) {
      setFormState(createMerchantFormState(initialMerchant))
    }
  }, [initialMerchant, open])

  const resetState = () => setFormState(createMerchantFormState(null))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({
      name: formState.name.trim(),
      ownerName: formState.ownerName.trim(),
      ownerId: formState.ownerId.trim(),
      status: formState.status as MerchantStatus,
      address: formState.address.trim(),
      contactEmail: formState.contactEmail.trim() || undefined,
      contactPhone: formState.contactPhone.trim() || undefined,
      categories: formState.categories
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    })
    resetState()
  }

  const modalTitle = initialMerchant ? (isFrench ? "Modifier le marchand" : "Edit merchant") : t("addMerchant")

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) resetState()
      onOpenChange(nextOpen)
    }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {isFrench ? "Définissez les paramètres du marchand" : "Define merchant settings"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isFrench ? "Nom" : "Name"}</Label>
              <Input value={formState.name} onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "Responsable" : "Owner"}</Label>
              <Input
                value={formState.ownerName}
                onChange={(e) => setFormState((prev) => ({ ...prev, ownerName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "ID propriétaire" : "Owner ID"}</Label>
              <Input
                value={formState.ownerId}
                onChange={(e) => setFormState((prev) => ({ ...prev, ownerId: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("status")}</Label>
              <Select value={formState.status} onValueChange={(value: MerchantFormState["status"]) => setFormState((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isFrench ? "Actif" : "Active"}</SelectItem>
                  <SelectItem value="pending">{isFrench ? "En attente" : "Pending"}</SelectItem>
                  <SelectItem value="inactive">{isFrench ? "Inactif" : "Inactive"}</SelectItem>
                  <SelectItem value="suspended">{isFrench ? "Suspendu" : "Suspended"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isFrench ? "Adresse" : "Address"}</Label>
            <Textarea
              rows={3}
              value={formState.address}
              onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formState.contactEmail} onChange={(e) => setFormState((prev) => ({ ...prev, contactEmail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{isFrench ? "Téléphone" : "Phone"}</Label>
              <Input value={formState.contactPhone} onChange={(e) => setFormState((prev) => ({ ...prev, contactPhone: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isFrench ? "Catégories" : "Categories"}</Label>
            <Input
              placeholder={isFrench ? "Séparé par des virgules" : "Comma separated"}
              value={formState.categories}
              onChange={(e) => setFormState((prev) => ({ ...prev, categories: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isFrench ? "Enregistrement..." : "Saving...") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const createMerchantFormState = (merchant: Shop | null): MerchantFormState => ({
  name: merchant?.name ?? "",
  ownerName: merchant?.ownerName ?? "",
  ownerId: merchant?.ownerId ?? "",
  status: merchant?.status ?? "active",
  address: merchant?.address ?? "",
  contactEmail: merchant?.contactEmail ?? "",
  contactPhone: merchant?.contactPhone ?? "",
  categories: merchant?.categories?.join(", ") ?? "",
})
