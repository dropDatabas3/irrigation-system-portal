"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Clock, Droplets, MapPin, Gauge, Thermometer, CloudRain, Droplet } from "lucide-react"
import type { ValveConfig } from "@/components/valve-config-list"
import { useState } from "react"

interface ValveConfigCardProps {
  config: ValveConfig
  onUpdate: (updates: Partial<ValveConfig>) => void
}

export function ValveConfigCard({ config, onUpdate }: ValveConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

  const toggleDay = (day: string) => {
    const newDays = config.schedule.days.includes(day)
      ? config.schedule.days.filter((d) => d !== day)
      : [...config.schedule.days, day]

    onUpdate({
      schedule: { ...config.schedule, days: newDays },
    })
  }

  return (
    <Card className="gradient-border">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-foreground">{config.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{config.zone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={config.enabled ? "default" : "secondary"}
              className={config.enabled ? "gradient-primary" : ""}
            >
              {config.enabled ? "Habilitada" : "Deshabilitada"}
            </Badge>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => onUpdate({ enabled })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${config.id}`}>Nombre de la Válvula</Label>
              <Input
                id={`name-${config.id}`}
                value={config.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`zone-${config.id}`}>Zona</Label>
              <Input
                id={`zone-${config.id}`}
                value={config.zone}
                onChange={(e) => onUpdate({ zone: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Programación</h3>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm mb-2 block">Días de la Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <Button
                      key={day}
                      variant={config.schedule.days.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day)}
                      className={config.schedule.days.includes(day) ? "gradient-primary" : ""}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`time-${config.id}`}>Hora de Inicio</Label>
                  <Input
                    id={`time-${config.id}`}
                    type="time"
                    value={config.schedule.startTime}
                    onChange={(e) =>
                      onUpdate({
                        schedule: { ...config.schedule, startTime: e.target.value },
                      })
                    }
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`duration-${config.id}`}>Duración (minutos)</Label>
                  <Input
                    id={`duration-${config.id}`}
                    type="number"
                    value={config.schedule.duration}
                    onChange={(e) =>
                      onUpdate({
                        schedule: { ...config.schedule, duration: Number.parseInt(e.target.value) },
                      })
                    }
                    className="bg-secondary/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Flow Rate Configuration */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-foreground">Caudal de Agua</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Caudal Objetivo</Label>
                  <span className="text-sm font-semibold text-foreground">{config.flowRate.target} L/min</span>
                </div>
                <Slider
                  value={[config.flowRate.target]}
                  onValueChange={([target]) =>
                    onUpdate({
                      flowRate: { ...config.flowRate, target },
                    })
                  }
                  min={config.flowRate.min}
                  max={config.flowRate.max}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: {config.flowRate.min} L/min</span>
                  <span>Max: {config.flowRate.max} L/min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Configuration */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-chart-3" />
              <h3 className="font-semibold text-foreground">Sensores Activos</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Droplet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Sensor de Humedad</p>
                    <p className="text-xs text-muted-foreground">Detiene el riego si hay humedad suficiente</p>
                  </div>
                </div>
                <Switch
                  checked={config.sensors.moisture}
                  onCheckedChange={(moisture) =>
                    onUpdate({
                      sensors: { ...config.sensors, moisture },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <Thermometer className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Sensor de Temperatura</p>
                    <p className="text-xs text-muted-foreground">Ajusta el riego según la temperatura</p>
                  </div>
                </div>
                <Switch
                  checked={config.sensors.temperature}
                  onCheckedChange={(temperature) =>
                    onUpdate({
                      sensors: { ...config.sensors, temperature },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <CloudRain className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Sensor de Lluvia</p>
                    <p className="text-xs text-muted-foreground">Cancela el riego si está lloviendo</p>
                  </div>
                </div>
                <Switch
                  checked={config.sensors.rain}
                  onCheckedChange={(rain) =>
                    onUpdate({
                      sensors: { ...config.sensors, rain },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
