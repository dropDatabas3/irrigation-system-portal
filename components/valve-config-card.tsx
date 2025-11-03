"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Droplets, MapPin, Thermometer, CloudRain, Droplet, Plus, X } from "lucide-react"
import type { ValveConfig } from "@/components/valve-config-list"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ValveConfigCardProps {
  config: ValveConfig
  onUpdate: (updates: Partial<ValveConfig>) => void
}

export function ValveConfigCard({ config, onUpdate }: ValveConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [profiles, setProfiles] = useState<Array<{ name: string; schedule: any }>>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [appliedProfileName, setAppliedProfileName] = useState<string | null>(null)
  const [originalScheduleJson, setOriginalScheduleJson] = useState<string | null>(null)

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
    liters: 1, // Default 1 liter
    consecutiveWaterings: 1, // Default 1 watering
    wateringIntervalMinutes: 3, // Default 3 minutes between consecutive waterings
  })

  // Load profiles when expanded
  useEffect(() => {
    if (!isExpanded) return
    let cancelled = false
    setLoadingProfiles(true)
    ;(async () => {
      try {
        const res = await fetch('/api/profiles', { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled && Array.isArray(j?.profiles)) setProfiles(j.profiles)
      } catch {}
      if (!cancelled) setLoadingProfiles(false)
    })()
    return () => { cancelled = true }
  }, [isExpanded])

  const scheduleJson = config.schedule ? JSON.stringify(config.schedule) : null
  const scheduleModifiedFromProfile = appliedProfileName && originalScheduleJson && scheduleJson && originalScheduleJson !== scheduleJson

  const handleApplyProfile = async (name: string) => {
    try {
      const idStr = config.id
      const res = await fetch(`/api/valves/${idStr}/apply-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const j = await res.json()
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'No se pudo aplicar el perfil')
      const p = profiles.find(p => p.name === name)
      if (p?.schedule) {
        onUpdate({ schedule: p.schedule as any })
        setAppliedProfileName(name)
        setOriginalScheduleJson(JSON.stringify(p.schedule))
      }
    } catch (e) {
      // no-op minimal
    }
  }

  const handleSaveProfile = async () => {
    try {
      if (!config.schedule) return
      const name = profileName.trim()
      if (!name) return
      const res = await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, schedule: config.schedule }) })
      const j = await res.json()
      if (!res.ok || !j?.ok) return
      setProfiles(prev => {
        const idx = prev.findIndex(p => p.name === name)
        const next = [...prev]
        if (idx >= 0) next[idx] = { name, schedule: config.schedule }
        else next.push({ name, schedule: config.schedule })
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setProfileName("")
      setAppliedProfileName(name)
      setOriginalScheduleJson(JSON.stringify(config.schedule))
    } catch {}
  }

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
              <h3 className="font-semibold text-foreground">Rutinas</h3>
            </div>

            {!config.schedule ? (
              <div className="p-4 rounded-lg bg-secondary/40 border border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">No hay rutina programada para esta válvula.</p>
                <Button type="button" variant="outline" className="bg-transparent"
                  onClick={() => !locked && onUpdate({ schedule: createDefaultSchedule() })}
                  disabled={locked} title={disabledTitle}>
                  <Plus className="w-4 h-4 mr-2" /> Crear rutina
                </Button>
              </div>
            ) : (
              <>
                {/* Profiles row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Cargar perfil de riego</Label>
                    <Select disabled={loadingProfiles || profiles.length === 0} onValueChange={(v: any) => v && handleApplyProfile(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProfiles ? 'Cargando…' : (profiles.length ? 'Elegir perfil' : 'Sin perfiles')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-auto">
                        {profiles.map(p => (
                          <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(config.schedule && (!appliedProfileName || scheduleModifiedFromProfile)) && (
                    <div className="space-y-2">
                      <Label>Guardar perfil de riego</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Nombre" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                        <Button type="button" variant="outline" className="bg-transparent" onClick={handleSaveProfile}>Guardar</Button>
                      </div>
                    </div>
                  )}
                </div>

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

            {/* Water Amount Field - ALWAYS shown when schedule exists */}
            <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-500" />
                <Label className="text-sm font-semibold">Cantidad de Agua por Riego</Label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Litros: {(config.schedule!.liters ?? 0).toFixed(2)} L
                </Label>
                <Input
                  type="number"
                  min={0.1}
                  max={200}
                  step={0.1}
                  value={config.schedule!.liters ?? 1}
                  onChange={(e) => {
                    const liters = Number(e.target.value) || 0
                    onUpdate({ schedule: { ...config.schedule!, liters } as any })
                  }}
                  className="bg-secondary/50"
                  disabled={locked}
                  title={disabledTitle}
                  placeholder="Litros de agua"
                />
                <p className="text-xs text-muted-foreground">
                  Ingrese la cantidad en litros (ej: 0.35 para 350ml, 1.5 para 1500ml)
                </p>
              </div>
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

            {/* Interval: days/hours + start time + consecutive waterings */}
            {config.schedule!.mode === 'interval' && (
              <div className="space-y-3 mt-2">
                <p className="text-sm text-muted-foreground">Riego cada cierto intervalo de tiempo</p>
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
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-foreground">
                    Frecuencia: Cada{" "}
                    {(config.schedule!.intervalDays ?? 0) > 0 && `${config.schedule!.intervalDays} día${(config.schedule!.intervalDays ?? 0) > 1 ? "s" : ""}`}
                    {(config.schedule!.intervalDays ?? 0) > 0 && (config.schedule!.intervalHours ?? 0) > 0 && " y "}
                    {(config.schedule!.intervalHours ?? 0) > 0 && `${config.schedule!.intervalHours} hora${(config.schedule!.intervalHours ?? 0) > 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Input type="time" value={config.schedule!.startTime ?? '08:00'} onChange={(e) => onUpdate({ schedule: { ...config.schedule!, startTime: e.target.value } })} className="bg-secondary/50" disabled={locked} title={disabledTitle} />
                </div>
                
                {/* Consecutive waterings configuration */}
                <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-3">
                  <p className="text-sm font-medium text-foreground">Riegos Consecutivos (opcional)</p>
                  <p className="text-xs text-muted-foreground">
                    Configura múltiples riegos seguidos cada vez que se cumple el intervalo
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Cantidad de Riegos</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.schedule!.consecutiveWaterings ?? 1}
                        onChange={(e) => onUpdate({ schedule: { ...config.schedule!, consecutiveWaterings: Number(e.target.value) } as any })}
                        className="bg-secondary/50"
                        disabled={locked}
                        title={disabledTitle}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intervalo (minutos)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={config.schedule!.wateringIntervalMinutes ?? 3}
                        onChange={(e) => onUpdate({ schedule: { ...config.schedule!, wateringIntervalMinutes: Number(e.target.value) } as any })}
                        className="bg-secondary/50"
                        disabled={locked || (config.schedule!.consecutiveWaterings ?? 1) <= 1}
                        title={disabledTitle}
                      />
                    </div>
                  </div>
                  {(config.schedule!.consecutiveWaterings ?? 1) > 1 && (
                    <div className="p-2 rounded bg-primary/10 text-xs text-foreground">
                      Se realizarán <strong>{config.schedule!.consecutiveWaterings} riegos</strong> separados por{" "}
                      <strong>{config.schedule!.wateringIntervalMinutes ?? 3} minutos</strong> cada vez que se cumpla el intervalo de{" "}
                      {(config.schedule!.intervalDays ?? 0) > 0 && `${config.schedule!.intervalDays} día${(config.schedule!.intervalDays ?? 0) > 1 ? "s" : ""}`}
                      {(config.schedule!.intervalDays ?? 0) > 0 && (config.schedule!.intervalHours ?? 0) > 0 && " y "}
                      {(config.schedule!.intervalHours ?? 0) > 0 && `${config.schedule!.intervalHours} hora${(config.schedule!.intervalHours ?? 0) > 1 ? "s" : ""}`}
                    </div>
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
