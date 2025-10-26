"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, PowerOff, RefreshCw, Settings, Cpu } from "lucide-react"
import { sendCmd } from "@/lib/api"
import { SUPPORTED_VALVES, toDeviceValve } from "@/lib/valves"
import { useRouter } from "next/navigation"

export function QuickActions() {
  const router = useRouter()

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
            <span className="text-sm font-medium">Configurar</span>
            <span className="text-[10px] opacity-90">Opciones del sistema</span>
          </Button>
        </div>
      </CardContent>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
