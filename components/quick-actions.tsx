"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, PowerOff, RefreshCw, Settings, Cpu, BookMarked } from "lucide-react"
import { sendCmd } from "@/lib/api"
import { SUPPORTED_VALVES, toDeviceValve } from "@/lib/valves"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useEffect, useState } from "react"

export function QuickActions() {
  const router = useRouter()
  const [tankInfo, setTankInfo] = useState<{ currentLiters: number; capacityLiters: number; percent: number } | null>(null)

  const handleActivateAll = async () => {
    // Open each supported valve for 3 seconds as a quick test
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
        // Provide geometry + current tank metrics for animated modal open without refetch
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

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Acciones Rápidas</CardTitle>
        <CardDescription>Controla el sistema de riego con un solo clic</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
          <Button
            type="button"
            onClick={handleActivateAll}
            className="gradient-primary h-auto py-4 flex-col gap-1 relative z-10"
            title="Enciende cada válvula por 3 segundos (prueba rápida)"
          >
            <Power className="w-5 h-5" />
            <span className="text-sm font-medium">Encender (3s)</span>
            <span className="text-[10px] opacity-90">Todas las válvulas</span>
          </Button>

          <Button
            type="button"
            onClick={handleDeactivateAll}
            variant="outline"
            className="h-auto py-4 flex-col gap-1 bg-transparent relative z-10"
            title="Envía la orden 'alloff' al dispositivo"
          >
            <PowerOff className="w-5 h-5" />
            <span className="text-sm font-medium">Apagar todo</span>
            <span className="text-[10px] opacity-90">Orden global de apagado</span>
          </Button>

          <Button
            type="button"
            onClick={handleRefresh}
            variant="outline"
            className="h-auto py-4 flex-col gap-1 bg-transparent relative z-10"
            title="Recarga el panel (no afecta al dispositivo)"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-sm font-medium">Recargar panel</span>
            <span className="text-[10px] opacity-90">Solo interfaz</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-auto py-4 flex-col gap-1 bg-transparent relative z-10"
            onClick={handleConfig}
            title="Ir a la configuración general"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Configuración</span>
            <span className="text-[10px] opacity-90">Opciones del sistema</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto py-4 flex-col gap-1 bg-transparent relative overflow-hidden"
            onClick={handleOpenTank}
            title="Estado del depósito"
          >
            {/* Copia del efecto de agua del TankStatusCard (llenado al % actual) */}
            <div className="absolute inset-0 flex items-end" aria-hidden>
              <div className="relative w-full" style={{ height: `${tankInfo ? Math.max(0, Math.min(100, tankInfo.percent)) : 50}%` }}>
                <div className="liquid-tank absolute bottom-0 left-0 right-0 h-full" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-200/40 mix-blend-screen" />
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-cyan-400/25" />
            </div>
            <div className="w-5 h-5 relative z-10">
              <Image src="/water-tank-1.png" alt="Tanque" fill className="object-contain" sizes="20px" />
            </div>
            <span className="text-sm font-medium relative z-10">Depósito</span>
            <span className="text-[10px] opacity-90 relative z-10">{tankInfo ? `${Math.round(tankInfo.currentLiters)}/${Math.round(tankInfo.capacityLiters)} L` : '—'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-auto py-4 flex-col gap-1 bg-transparent"
            onClick={handleOpenProfiles}
            title="Perfiles de riego"
          >
            <BookMarked className="w-5 h-5" />
            <span className="text-sm font-medium">Perfiles</span>
            <span className="text-[10px] opacity-90">Crear, editar, aplicar</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto py-4 flex-col gap-1 bg-transparent"
            onClick={handleChipInfo}
            title="Ver información del chip"
          >
            <Cpu className="w-5 h-5" />
            <span className="text-sm font-medium">Chip info</span>
            <span className="text-[10px] opacity-90">Wi‑Fi, FS, memoria</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
