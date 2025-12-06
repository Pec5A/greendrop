"use client"

import type React from "react"

import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
