import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import PWARegister from "@/components/pwa-register"
import InstallPrompt from "@/components/install-prompt"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Sistema de Riego Inteligente",
  description: "Portal de configuración y monitoreo de sistema de riego",
  manifest: "/manifest.json",
  themeColor: "#020617",
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
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground overflow-x-hidden`} suppressHydrationWarning>
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 -z-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <div className="fixed inset-0 -z-40 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />
        
        <main className="relative flex min-h-screen flex-col">
          {children}
        </main>
        
        <Analytics />
        <PWARegister />
        <InstallPrompt />
      </body>
    </html>
  )
}
