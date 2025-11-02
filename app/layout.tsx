import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import PWARegister from "@/components/pwa-register"
import InstallPrompt from "@/components/install-prompt"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Riego Inteligente",
  description: "Portal de configuración y monitoreo de sistema de riego",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  icons: {
    icon: "/placeholder-logo.png",
    apple: "/placeholder-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Analytics />
        {/* Register service worker for PWA behavior (client component, only runs on client) */}
        <PWARegister />
        {/* Surface native PWA install when available */}
        <InstallPrompt />
      </body>
    </html>
  )
}
