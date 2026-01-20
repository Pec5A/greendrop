"use client"

import { useEffect, useMemo, useState } from "react"
import type { Product } from "@/lib/types"
import {
  subscribeToProducts,
  createProduct as createProductService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
} from "@/lib/firebase/services/products"
import { logProductCreated, logProductUpdated } from "@/lib/firebase/services/activity-logs"

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (data) => {
        setProducts(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const stats = useMemo(() => {
    const lowStock = products.filter((product) => {
      if (typeof product.minStock !== "number") return product.stock <= 5
      return product.stock <= product.minStock
    })
    return {
      total: products.length,
      active: products.filter((p) => p.status === "active").length,
      draft: products.filter((p) => p.status === "draft").length,
      archived: products.filter((p) => p.status === "archived").length,
      outOfStock: products.filter((p) => p.stock === 0).length,
      lowStock: lowStock.length,
    }
  }, [products])

  const createProduct = async (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    const id = await createProductService(product)
    await logProductCreated(id, product.name)
    return id
  }

  const updateProduct = async (id: string, product: Partial<Product>) => {
    await updateProductService(id, product)
    await logProductUpdated(id, product.name ?? "catalog-item", product)
  }

  const deleteProduct = async (id: string) => {
    await deleteProductService(id)
  }

  return {
    products,
    loading,
    error,
    stats,
    createProduct,
    updateProduct,
    deleteProduct,
  }
}
