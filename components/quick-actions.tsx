"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, PowerOff, RefreshCw, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickActions() {
  const router = useRouter()

  const handleActivateAll = () => {
    console.log("[v0] Activate All clicked")
    // TODO: Implement activate all valves logic
  }

  const handleDeactivateAll = () => {
    console.log("[v0] Deactivate All clicked")
    // TODO: Implement deactivate all valves logic
  }

  const handleRefresh = () => {
    console.log("[v0] Refresh clicked")
    window.location.reload()
  }

  const handleConfig = () => {
    console.log("[v0] Config clicked, navigating to /dashboard/config")
    router.push("/dashboard/config")
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
            className="gradient-primary h-auto py-4 flex-col gap-2 relative z-10"
          >
            <Power className="w-5 h-5" />
            <span className="text-sm">Activar Todo</span>
          </Button>

          <Button
            type="button"
            onClick={handleDeactivateAll}
            variant="outline"
            className="h-auto py-4 flex-col gap-2 bg-transparent relative z-10"
          >
            <PowerOff className="w-5 h-5" />
            <span className="text-sm">Desactivar Todo</span>
          </Button>

          <Button
            type="button"
            onClick={handleRefresh}
            variant="outline"
            className="h-auto py-4 flex-col gap-2 bg-transparent relative z-10"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-sm">Actualizar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-auto py-4 flex-col gap-2 bg-transparent relative z-10"
            onClick={handleConfig}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">Configurar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
