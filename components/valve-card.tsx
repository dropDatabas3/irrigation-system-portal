"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Clock, Droplets, MapPin, TrendingUp, Settings } from "lucide-react"
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
        return "Activa"
      case "inactive":
        return "Inactiva"
      default:
        return "Desactivada"
    }
  }

  return (
    <Card className="gradient-border hover:shadow-lg transition-shadow relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{valve.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {valve.zone}
            </div>
          </div>
          <Badge className={getStatusColor(valve.status)}>{getStatusText(valve.status)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Flow Rate and Water Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Caudal</p>
                <p className="text-sm font-semibold text-foreground">{valve.flowRate.toFixed(1)} L/min</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Por riego</p>
                <p className="text-sm font-semibold text-foreground">
                  {valve.waterAmount} {valve.waterUnit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule and Last Active */}
        <div className="space-y-2">
          {valve.schedule && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Programado:</span>
              <span className="text-foreground font-medium">{valve.schedule}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Droplets className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Última activación:</span>
            <span className="text-foreground">{valve.lastActive}</span>
          </div>
        </div>

        {/* Control Switch and Settings Button */}
        <div className="flex items-center justify-between pt-2 border-t border-border gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-foreground">Control Manual</span>
            <Switch
              checked={valve.status === "active"}
              onCheckedChange={(checked) => {
                console.log("[v0] Valve switch toggled:", { valveId: valve.id, checked })
                onToggle()
              }}
              disabled={valve.status === "off"}
              className="relative z-10"
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
          >
            <Settings className="w-4 h-4" />
            Ver más
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
