"use client"

import { Power, PowerOff, RefreshCw, Settings, Cpu, BookMarked } from "lucide-react"
import { sendCmd } from "@/lib/api"
import { SUPPORTED_VALVES, toDeviceValve } from "@/lib/valves"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useEffect, useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function QuickActions() {
  const router = useRouter()
  const [tankInfo, setTankInfo] = useState<{ currentLiters: number; capacityLiters: number; percent: number } | null>(null)

  const handleActivateAll = async () => {
    for (const v of SUPPORTED_VALVES) {
      try {
        await sendCmd({ action: "openMs", valve: toDeviceValve(v), ms: 3000 })
      } catch (e) {
        console.error("openMs failed", v, e)
      }
    }
  }

  const handleDeactivateAll = async () => {
    try {
      await sendCmd({ action: "alloff" })
    } catch (e) {
      console.error("alloff failed", e)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleConfig = () => {
    router.push("/dashboard/config")
  }

  const handleChipInfo = () => {
    router.push("/chip-info")
  }

  const handleOpenTank = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        if (!rect || !tankInfo) return
        window.dispatchEvent(
          new CustomEvent('tank:open', {
            detail: {
              originRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              tankInfo: {
                currentLiters: tankInfo.currentLiters,
                capacityLiters: tankInfo.capacityLiters,
                percent: tankInfo.percent,
              },
            },
          })
        )
  }

  const handleOpenProfiles = () => {
    window.dispatchEvent(new CustomEvent('profiles:open'))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/tank', { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled && j?.ok) setTankInfo({ currentLiters: j.currentLiters, capacityLiters: j.capacityLiters, percent: j.percent })
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  const ActionButton = ({ 
    icon: Icon, 
    label, 
    subLabel, 
    onClick, 
    variant = "default", 
    className,
    children 
  }: any) => (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300 overflow-hidden group",
        variant === "primary" 
          ? "bg-primary/20 border-primary/30 hover:bg-primary/30 hover:border-primary/50 hover:shadow-[0_0_20px_-5px_var(--primary)]" 
          : "bg-card/40 border-white/5 hover:bg-card/60 hover:border-white/10 hover:shadow-lg",
        className
      )}
    >
      {children}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <div className={cn(
          "p-2 rounded-full transition-colors duration-300",
          variant === "primary" ? "bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground" : "bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-foreground"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {subLabel && <span className="text-[10px] text-muted-foreground">{subLabel}</span>}
      </div>
    </motion.button>
  )

  return (
    <GlassCard className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Acciones Rápidas</h2>
        <p className="text-sm text-muted-foreground">Control directo del sistema</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ActionButton 
          icon={Power} 
          label="Test Rápido" 
          subLabel="3s por válvula" 
          onClick={handleActivateAll}
          variant="primary"
        />

        <ActionButton 
          icon={PowerOff} 
          label="Apagar Todo" 
          subLabel="Detener riego" 
          onClick={handleDeactivateAll}
        />

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenTank}
          className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 hover:border-cyan-500/40 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)] transition-all duration-300 overflow-hidden group col-span-1 md:col-span-1"
        >
          {/* Liquid Effect Background */}
          <div className="absolute inset-0 flex items-end opacity-50 group-hover:opacity-70 transition-opacity" aria-hidden>
            <div className="relative w-full" style={{ height: `${tankInfo ? Math.max(0, Math.min(100, tankInfo.percent)) : 50}%` }}>
              <div className="liquid-tank absolute bottom-0 left-0 right-0 h-full bg-cyan-500/30" />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-200/40 mix-blend-screen" />
            </div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="w-8 h-8 relative mb-1 drop-shadow-lg">
              <Image src="/water-tank-1.png" alt="Tanque" fill className="object-contain" sizes="32px" />
            </div>
            <span className="text-sm font-medium text-cyan-100">Depósito</span>
            <span className="text-[10px] text-cyan-200/70 font-mono">
              {tankInfo ? `${Math.round(tankInfo.currentLiters)}/${Math.round(tankInfo.capacityLiters)}L` : '—'}
            </span>
          </div>
        </motion.button>

        <ActionButton 
          icon={BookMarked} 
          label="Perfiles" 
          subLabel="Gestionar rutinas" 
          onClick={handleOpenProfiles}
        />

        <ActionButton 
          icon={RefreshCw} 
          label="Recargar" 
          subLabel="Interfaz" 
          onClick={handleRefresh}
        />

        <ActionButton 
          icon={Settings} 
          label="Ajustes" 
          subLabel="Sistema" 
          onClick={handleConfig}
        />

        <ActionButton 
          icon={Cpu} 
          label="Chip Info" 
          subLabel="Hardware" 
          onClick={handleChipInfo}
        />
      </div>
    </GlassCard>
  )
}
