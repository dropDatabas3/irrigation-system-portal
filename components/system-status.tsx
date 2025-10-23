"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, Droplets, Power, Thermometer } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function SystemStatus() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="gradient-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estado del Sistema</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="gradient-primary">
                  <Power className="w-3 h-3 mr-1" />
                  Activo
                </Badge>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Válvulas Activas</p>
              <p className="text-2xl font-bold text-foreground mt-2">2 / 6</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Temperatura</p>
              <p className="text-2xl font-bold text-foreground mt-2">24°C</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-chart-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Consumo Hoy</p>
              <p className="text-2xl font-bold text-foreground mt-2">145L</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-chart-4/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-chart-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
