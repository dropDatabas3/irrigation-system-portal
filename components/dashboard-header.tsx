"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Settings, User, BarChart3, TestTube } from "lucide-react"
import { useEffect, useState } from "react"
import { useIrrigationEvents } from "@/lib/useEvents"
import Image from "next/image"
import { TankPanel } from "@/components/tank-panel"
import { ProfilesPanel } from "@/components/profiles-panel"
import { useRouter } from "next/navigation"
import { logout } from "@/app/actions/auth"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardHeader() {
  const router = useRouter()
  const { lastResult } = useIrrigationEvents()
  const [tank, setTank] = useState<{ currentLiters: number; capacityLiters: number; percent: number } | null>(null)

  // Load tank on mount and refresh when new results arrive
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/tank', { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled && j?.ok) setTank({ currentLiters: j.currentLiters, capacityLiters: j.capacityLiters, percent: j.percent })
      } catch {}
    }
    load()
    
    const onUpdate = () => load()
    globalThis.addEventListener('tank:update', onUpdate)

    // slight debounce after a result
    if (lastResult) setTimeout(load, 300)
    return () => { 
      cancelled = true 
      globalThis.removeEventListener('tank:update', onUpdate)
    }
  }, [lastResult])

  const handleLogout = async () => {
    await logout()
  }

  const handleMetricsClick = () => {
    router.push("/dashboard/metrics")
  }

  const handleTestBenchClick = () => {
    router.push("/dashboard/test-bench")
  }

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="border-b border-white/5 bg-card/30 backdrop-blur-xl sticky top-0 z-40 shadow-sm"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20 flex items-center justify-center ring-1 ring-white/20 relative overflow-hidden">
            <Image src="/pineapple_logo.png" alt="PineApple Logo" fill className="object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">PineApple Grow</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-50">
          {/* Tank mini-indicator with image icon; opens panel on click */}
          {tank && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button" 
              onClick={() => globalThis.dispatchEvent(new CustomEvent('tank:open'))} 
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md shadow-sm"
            >
              <div className="w-5 h-5 relative">
                <Image src="/water-tank-1.png" alt="Tanque" fill className="object-contain drop-shadow-md" sizes="20px" />
              </div>
              <span className="text-xs text-foreground/90 font-medium">{tank.percent}% · {Math.round(tank.currentLiters)} L</span>
            </motion.button>
          )}
          
          <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full relative z-10 hover:bg-white/10 hover:text-primary transition-colors"
            onClick={handleMetricsClick}
          >
            <BarChart3 className="w-5 h-5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full relative z-10 hover:bg-white/10 hover:text-primary transition-colors"
            onClick={handleTestBenchClick}
            title="Banco de pruebas"
          >
            <TestTube className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="rounded-full relative z-10 hover:bg-white/10 hover:text-primary transition-colors">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-50 bg-card/90 backdrop-blur-xl border-white/10 shadow-2xl">
              <DropdownMenuLabel className="text-muted-foreground">Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Mount panels so header/quick actions can open them */}
      <TankPanel />
      <ProfilesPanel />
    </motion.header>
  )
}
