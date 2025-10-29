"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Droplets, MapPin, Thermometer, CloudRain, Droplet, Plus, X } from "lucide-react"
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
    if (!config.schedule) return
    const sched = config.schedule
    const newDays = sched.days.includes(day)
      ? sched.days.filter((d) => d !== day)
      : [...sched.days, day]

    onUpdate({
      schedule: { ...sched, days: newDays } as any,
    })
  }

  const locked = !!config.lockedDisabled
  const disabledTitle = locked ? (config.disabledReason || "Deshabilitada por sistema") : undefined

  const createDefaultSchedule = () => ({
    mode: 'daily' as const,
    days: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    times: ["08:00"],
  })

  return (
    <Card className={`gradient-border ${locked ? 'opacity-60' : ''}`} title={disabledTitle}>
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
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <Badge
              variant={config.enabled ? "default" : "secondary"}
              className={config.enabled ? "gradient-primary" : ""}
            >
              {config.enabled ? "Habilitada" : "Deshabilitada"}
            </Badge>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => !locked && onUpdate({ enabled })}
              disabled={locked}
              title={disabledTitle}
            />
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Schedule Configuration with Modes */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Programación</h3>
            </div>

            {!config.schedule ? (
              <div className="p-4 rounded-lg bg-secondary/40 border border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">No hay programa para esta válvula.</p>
                <Button type="button" variant="outline" className="bg-transparent"
                  onClick={() => !locked && onUpdate({ schedule: createDefaultSchedule() })}
                  disabled={locked} title={disabledTitle}>
                  <Plus className="w-4 h-4 mr-2" /> Crear programa
                </Button>
              </div>
            ) : (
              <>
                {/* Mode selector */}
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'daily', label: 'Diario' },
                    { id: 'weekly', label: 'Semanal' },
                    { id: 'interval', label: 'Por intervalo' },
                    { id: 'custom', label: 'Personalizado' }
                  ] as const).map(m => (
                    <Button
                      key={m.id}
                      size="sm"
                      variant={config.schedule!.mode === m.id ? 'default' : 'outline'}
                      className={config.schedule!.mode === m.id ? 'gradient-primary' : ''}
                      onClick={() => !locked && onUpdate({ schedule: { ...config.schedule!, mode: m.id } as any })}
                      disabled={locked}
                      title={disabledTitle}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>

            {/* Daily: multiple times */}
            {config.schedule!.mode === 'daily' && (
              <div className="space-y-3 mt-2">
                <Label className="text-sm">Horarios (por día)</Label>
                {(config.schedule!.times ?? ["08:00"]).map((time, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const times = [...(config.schedule!.times ?? ["08:00"])];
                        times[i] = e.target.value;
                        onUpdate({ schedule: { ...config.schedule!, times } as any })
                      }}
                      className="bg-secondary/50"
                      disabled={locked}
                      title={disabledTitle}
                    />
                    {(config.schedule!.times ?? []).length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => {
                        const times = [...(config.schedule!.times ?? ["08:00"])];
                        times.splice(i, 1);
                        onUpdate({ schedule: { ...config.schedule!, times } as any })
                      }} disabled={locked} title={disabledTitle}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {((config.schedule!.times ?? []).length) < 6 && (
                  <Button type="button" variant="outline" className="bg-transparent" onClick={() => {
                    const times = [...(config.schedule!.times ?? [])];
                    times.push("12:00");
                    onUpdate({ schedule: { ...config.schedule!, times } as any })
                  }} disabled={locked} title={disabledTitle}>
                    <Plus className="w-4 h-4 mr-2" /> Agregar horario
                  </Button>
                )}
              </div>
            )}

            {/* Weekly: pick days + one time */}
            {config.schedule!.mode === 'weekly' && (
              <div className="space-y-3 mt-2">
                <Label className="text-sm">Días de la semana</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map(d => (
                    <Button key={d} size="sm" variant={config.schedule!.days.includes(d) ? 'default' : 'outline'}
                      className={config.schedule!.days.includes(d) ? 'gradient-primary' : ''}
                      onClick={() => {
                        if (locked) return;
                        const selected = config.schedule!.days.includes(d)
                          ? config.schedule!.days.filter(x => x !== d)
                          : [...config.schedule!.days, d];
                        onUpdate({ schedule: { ...config.schedule!, days: selected } })
                      }} disabled={locked} title={disabledTitle}>
                      {d}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Hora</Label>
                  <Input type="time" value={config.schedule!.startTime ?? '08:00'} onChange={(e) => onUpdate({ schedule: { ...config.schedule!, startTime: e.target.value } })} className="bg-secondary/50" disabled={locked} title={disabledTitle} />
                </div>
              </div>
            )}

            {/* Interval: days/hours + start time */}
            {config.schedule!.mode === 'interval' && (
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Días</Label>
                    <Input type="number" min={0} max={30} value={config.schedule!.intervalDays ?? 0} onChange={(e) => onUpdate({ schedule: { ...config.schedule!, intervalDays: Number(e.target.value) } as any })} className="bg-secondary/50" disabled={locked} title={disabledTitle} />
                  </div>
                  <div className="space-y-2">
                    <Label>Horas</Label>
                    <Input type="number" min={0} max={23} value={config.schedule!.intervalHours ?? 0} onChange={(e) => onUpdate({ schedule: { ...config.schedule!, intervalHours: Number(e.target.value) } as any })} className="bg-secondary/50" disabled={locked} title={disabledTitle} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Input type="time" value={config.schedule!.startTime ?? '08:00'} onChange={(e) => onUpdate({ schedule: { ...config.schedule!, startTime: e.target.value } })} className="bg-secondary/50" disabled={locked} title={disabledTitle} />
                </div>
                {/* Optional: multiple times per watering day */}
                <div className="space-y-2">
                  <Label className="text-sm">Horarios (en día de riego, opcional)</Label>
                  {(config.schedule!.times ?? ["08:00"]).map((time, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => {
                          const times = [...(config.schedule!.times ?? ["08:00"])];
                          times[i] = e.target.value;
                          onUpdate({ schedule: { ...config.schedule!, times } as any })
                        }}
                        className="bg-secondary/50"
                        disabled={locked}
                        title={disabledTitle}
                      />
                      {(config.schedule!.times ?? []).length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          const times = [...(config.schedule!.times ?? ["08:00"])];
                          times.splice(i, 1);
                          onUpdate({ schedule: { ...config.schedule!, times } as any })
                        }} disabled={locked} title={disabledTitle}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {((config.schedule!.times ?? []).length) < 6 && (
                    <Button type="button" variant="outline" className="bg-transparent" onClick={() => {
                      const times = [...(config.schedule!.times ?? [])];
                      times.push("12:00");
                      onUpdate({ schedule: { ...config.schedule!, times } as any })
                    }} disabled={locked} title={disabledTitle}>
                      <Plus className="w-4 h-4 mr-2" /> Agregar horario
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Custom: days + multiple times */}
            {config.schedule!.mode === 'custom' && (
              <div className="space-y-3 mt-2">
                <Label className="text-sm">Días de la semana</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map(d => (
                    <Button key={d} size="sm" variant={config.schedule!.days.includes(d) ? 'default' : 'outline'}
                      className={config.schedule!.days.includes(d) ? 'gradient-primary' : ''}
                      onClick={() => {
                        if (locked) return;
                        const selected = config.schedule!.days.includes(d)
                          ? config.schedule!.days.filter(x => x !== d)
                          : [...config.schedule!.days, d];
                        onUpdate({ schedule: { ...config.schedule!, days: selected } })
                      }} disabled={locked} title={disabledTitle}>
                      {d}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Horarios</Label>
                  {(config.schedule!.times ?? ["08:00"]).map((time, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" value={time} onChange={(e) => {
                        const times = [...(config.schedule!.times ?? ["08:00"])];
                        times[i] = e.target.value;
                        onUpdate({ schedule: { ...config.schedule!, times } as any })
                      }} className="bg-secondary/50" disabled={locked} title={disabledTitle} />
                      {(config.schedule!.times ?? []).length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          const times = [...(config.schedule!.times ?? ["08:00"])];
                          times.splice(i, 1);
                          onUpdate({ schedule: { ...config.schedule!, times } as any })
                        }} disabled={locked} title={disabledTitle}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {((config.schedule!.times ?? []).length) < 6 && (
                    <Button type="button" variant="outline" className="bg-transparent" onClick={() => {
                      const times = [...(config.schedule!.times ?? [])];
                      times.push("12:00");
                      onUpdate({ schedule: { ...config.schedule!, times } as any })
                    }} disabled={locked} title={disabledTitle}>
                      <Plus className="w-4 h-4 mr-2" /> Agregar horario
                    </Button>
                  )}
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Flow Rate Configuration removed per requirements */}

          {/* Sensor Configuration (disabled - Próximamente) */}
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-chart-3" />
              <h3 className="font-semibold text-foreground">Sensores Activos</h3>
              <Badge variant="secondary">Próximamente</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card opacity-60">
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
                  onCheckedChange={() => {}}
                  disabled={true}
                  title={disabledTitle}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card opacity-60">
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
                  onCheckedChange={() => {}}
                  disabled={true}
                  title={disabledTitle}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card opacity-60">
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
                  onCheckedChange={() => {}}
                  disabled={true}
                  title={disabledTitle}
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
