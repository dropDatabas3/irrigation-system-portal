"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Clock, Droplets, MapPin, TrendingUp, Settings } from "lucide-react"
import { FlowGauge } from "@/components/flow-gauge"
import type { Valve } from "@/components/valve-grid"

interface ValveCardProps {
  valve: Valve
  onToggle: () => void
  onClick: () => void
}

export function ValveCard({ valve, onToggle, onClick }: ValveCardProps) {
  const getStatusColor = (status: Valve["status"]) => {
    switch (status) {
      case "active":
        return "bg-primary text-primary-foreground"
      case "inactive":
        return "bg-yellow-500 text-yellow-50"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: Valve["status"]) => {
    switch (status) {
      case "active":
        return "Encendida"
      case "inactive":
        return "Apagada"
      default:
        return "Deshabilitada"
    }
  }

  const isLockedOff = valve.status === "off"
  const isEnabled = valve.enabled !== false
  const offTitle = isLockedOff ? "Deshabilitada por sistema por problemas de hardware" : undefined

  return (
    <Card className={`gradient-border hover:shadow-lg transition-shadow relative ${(!isEnabled || isLockedOff) ? 'opacity-70' : ''}`} title={offTitle}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{valve.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {valve.zone}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(valve.status)}>{getStatusText(valve.status)}</Badge>
            {!isEnabled && <Badge variant="outline" className="text-muted-foreground">Deshabilitada</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Live run info when active */}
        {isEnabled && valve.status === 'active' ? (
          <div className="space-y-3 min-h-[140px]">
            {/* Liters progress X / Y */}
            <div className="p-3 rounded-lg bg-secondary/40 border border-secondary/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-cyan-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">Riego en curso</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {((valve.runLiters ?? 0).toFixed(2))} / {((valve.runTargetLiters ?? 0).toFixed(2))} L
                </p>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary/70 mt-2 overflow-hidden">
                {(() => {
                  const pct = Math.max(0, Math.min(100, ((valve.runLiters ?? 0) / Math.max(0.0001, (valve.runTargetLiters ?? 0))) * 100))
                  return <div className="h-2 bg-cyan-500 transition-all" style={{ width: pct + '%' }} />
                })()}
              </div>
              {/* Tiempo restante estimado */}
              <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>Tiempo restante (estimado)</span>
                <span className="font-medium text-foreground">
                  {(() => {
                    const lph = valve.flowLph ?? 0
                    const remaining = Math.max(0, (valve.runTargetLiters ?? 0) - (valve.runLiters ?? 0))
                    if (lph <= 0 || remaining <= 0) return '—'
                    const sec = Math.ceil(remaining / (lph / 3600))
                    const m = Math.floor(sec / 60), s = sec % 60
                    return `${m}m ${s}s`
                  })()}
                </span>
              </div>
            </div>

            {/* Semicircular flow gauge 0..40 L/h */}
            <div className="p-3 rounded-lg bg-secondary/40 border border-secondary/60">
              <FlowGauge value={valve.flowLph ?? 0} max={40} />
            </div>
          </div>
        ) : (
          // Inactive: show next schedule and last active
          <div className="space-y-2 min-h-[140px]">
            {valve.schedule && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Próximo:</span>
                <span className="text-foreground font-medium">{valve.schedule}</span>
              </div>
            )}
            {valve.nextAtSec && valve.nextAtSec > 0 && (
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const delta = Math.max(0, valve.nextAtSec * 1000 - Date.now())
                  const h = Math.floor(delta / 3600000)
                  const m = Math.floor((delta % 3600000) / 60000)
                  const s = Math.floor((delta % 60000) / 1000)
                  return `Comienza en ${h}h ${m}m ${s}s`
                })()}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Droplets className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Última activación:</span>
              <span className="text-foreground">{valve.lastActive}</span>
            </div>
            {!isEnabled && (
              <div className="text-xs text-muted-foreground">Esta válvula está deshabilitada. Puedes habilitarla con el interruptor de abajo o desde "Ver más".</div>
            )}
          </div>
        )}

        {/* Control Switch and Settings Button */}
        <div className="flex items-center justify-between pt-2 border-t border-border gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-foreground">Habilitada</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={() => onToggle()}
              disabled={isLockedOff}
              className="relative z-10"
              title={offTitle}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("[v0] Valve 'Ver más' clicked:", valve.id)
              onClick()
            }}
            className="gap-2 bg-transparent relative z-10"
            disabled={false}
            title={offTitle}
          >
            <Settings className="w-4 h-4" />
            Ver más
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
