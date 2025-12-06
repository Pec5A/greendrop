import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/language-context"
import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "GreenDrop - Livraison CBD Eco-Responsable",
    template: "%s | GreenDrop",
  },
  description:
    "Plateforme de livraison de produits CBD legaux en France avec une approche eco-responsable. Suivi en temps reel, paiement securise, verification d'identite.",
  keywords: ["CBD", "livraison", "eco-responsable", "France", "GreenDrop", "produits CBD"],
  authors: [{ name: "GreenDrop" }],
  openGraph: {
    title: "GreenDrop - Livraison CBD Eco-Responsable",
    description: "Plateforme de livraison de produits CBD legaux en France avec une approche eco-responsable.",
    url: "https://pec5a-kaysv2-hm7i.vercel.app",
    siteName: "GreenDrop",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GreenDrop - Livraison CBD Eco-Responsable",
    description: "Plateforme de livraison de produits CBD legaux en France.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="greendrop-theme">
          <LanguageProvider>
            <AuthWrapper>{children}</AuthWrapper>
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
