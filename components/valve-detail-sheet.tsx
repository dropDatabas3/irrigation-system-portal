"use client"

import { useState, useEffect } from "react"
import { sendCmd } from "@/lib/api"
import { toDeviceValve } from "@/lib/valves"
import { buildJobs } from "@/lib/schedule"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Calendar,
  Clock,
  Droplets,
  TrendingUp,
  Waves,
  Activity,
  Settings,
  Save,
  TestTube,
  Plus,
  X,
} from "lucide-react"
import type { Valve } from "@/components/valve-grid"

interface ValveDetailSheetProps {
  valve: Valve
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (valve: Valve) => void
}

export function ValveDetailSheet({ valve, open, onOpenChange, onUpdate }: ValveDetailSheetProps) {
  const [editedValve, setEditedValve] = useState(valve)
  const [isTesting, setIsTesting] = useState(false)
  // Control de habilitación separado del estado de ejecución (activa/inactiva)
  const [enabled, setEnabled] = useState<boolean>(valve.enabled !== false)
  const [metrics, setMetrics] = useState<null | {
    lastRun: { ts: number; liters: number; durationMs: number } | null
    seven: { liters: number; durationMs: number; runs: number }
    thirty: { liters: number; durationMs: number; runs: number }
  }>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [hasConfig, setHasConfig] = useState<boolean>(false)
  const [hasValveJobs, setHasValveJobs] = useState<boolean>(false)

  const [scheduleMode, setScheduleMode] = useState<"daily" | "weekly" | "interval" | "custom">("daily")
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]) // 0=Domingo, 1=Lunes, etc.
  const [intervalDays, setIntervalDays] = useState(2)
  const [intervalHours, setIntervalHours] = useState(0)
  const [scheduleTime, setScheduleTime] = useState("08:00")
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["08:00", "18:00"])

  const [metricsDateRange, setMetricsDateRange] = useState<"week" | "month" | "year" | "custom">("week")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  // Load per-valve metrics
  const deviceValve = toDeviceValve(valve.id as any)
  // Sync local state when valve prop changes or sheet opens
  useEffect(() => {
    setEditedValve(valve)
    setEnabled(valve.enabled !== false)
  }, [valve, open])

  useEffect(() => {
    let cancelled = false
    if (!deviceValve) return
    setLoadingMetrics(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/metrics/valve?valve=${deviceValve}`, { cache: 'no-store' })
        const json = await res.json()
        if (!cancelled && json?.ok) {
          setMetrics({
            lastRun: json.lastRun || null,
            seven: json.seven || { liters: 0, durationMs: 0, runs: 0 },
            thirty: json.thirty || { liters: 0, durationMs: 0, runs: 0 },
          })
        }
      } catch {}
      if (!cancelled) setLoadingMetrics(false)
    })()
    return () => { cancelled = true }
  }, [deviceValve, open])

  // Detect if there is any saved config and whether this valve has jobs
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' })
        const json = await res.json()
        const cfg = json?.config || {}
        const hasCfg = !!cfg && (Array.isArray(cfg?.valves) || Array.isArray(cfg?.jobs))
        const jobsArr: any[] = Array.isArray(cfg?.jobs) ? cfg.jobs : []
        const hasJobsForValve = jobsArr.some(j => Number(j?.valve) === deviceValve)
        if (!cancelled) {
          setHasConfig(!!hasCfg)
          setHasValveJobs(!!hasJobsForValve)
        }
      } catch {
        if (!cancelled) { setHasConfig(false); setHasValveJobs(false) }
      }
    })()
    return () => { cancelled = true }
  }, [deviceValve, open])

  const handleSave = async () => {
    try {
      // 1) Update UI state immediately
      onUpdate(editedValve)

      // 2) Build jobs for this valve from current scheduling controls
      const liters = editedValve.waterUnit === 'ml' ? Number(editedValve.waterAmount) / 1000 : Number(editedValve.waterAmount)
      const { jobs } = buildJobs({
        valveId: editedValve.id as any,
        liters: liters,
        mode: scheduleMode,
        scheduleTimes: scheduleMode === 'daily'
          ? scheduleTimes
          : (scheduleMode === 'custom'
            ? scheduleTimes
            : (scheduleMode === 'interval' ? scheduleTimes : undefined)),
        selectedDays: scheduleMode === 'weekly' || scheduleMode === 'custom' ? selectedDays : undefined,
        weeklyTime: scheduleMode === 'weekly' ? scheduleTime : undefined,
        intervalDays: scheduleMode === 'interval' ? intervalDays : undefined,
        intervalHours: scheduleMode === 'interval' ? intervalHours : undefined,
        startTime: scheduleMode === 'interval' ? scheduleTime : undefined,
        horizonDays: 7,
      })

      // 3) Merge with existing config so we don't wipe other valves' schedules/metadata
      let baseJobs: any[] = []
      let baseValves: Array<{ id: number; enabled?: boolean; name?: string; zone?: string }> = []
      try {
        const res = await fetch('/api/config', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          const cfg = data?.config
          const arr = Array.isArray(cfg?.jobs) ? cfg.jobs : []
          // keep jobs for other valves only
          baseJobs = arr.filter((j: any) => Number(j?.valve) !== toDeviceValve(editedValve.id as any))
          const valvesArr: Array<any> = Array.isArray(cfg?.valves) ? cfg.valves : []
          // keep valves metadata for other valves only
          baseValves = valvesArr.filter((v: any) => Number(v?.id) !== toDeviceValve(editedValve.id as any))
        }
      } catch {}

      const merged = [...baseJobs, ...jobs]
      merged.sort((a: any, b: any) => (a?.at || 0) - (b?.at || 0))

      // 4) Build valves array update for this valve (habilitada/deshabilitada + nombre/zona)
      const devValve = toDeviceValve(editedValve.id as any)
      const updatedValves = [
        ...baseValves,
        { id: devValve, enabled, name: editedValve.name, zone: editedValve.zone },
      ]

      // 5) Send config/set with merged jobs and valves
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: merged, valves: updatedValves }),
      })

      onOpenChange(false)
    } catch (e) {
      console.error('save valve config failed', e)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const devValve = toDeviceValve(valve.id as any)
      if (devValve) await sendCmd({ action: "openMs", valve: devValve, ms: 3000 })
    } catch (e) {
      console.error("Valve test failed", e)
    } finally {
      setTimeout(() => setIsTesting(false), 3000)
    }
  }

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

  const toggleDay = (day: number) => {
    setSelectedDays((prev: number[]) => (prev.includes(day) ? prev.filter((d: number) => d !== day) : [...prev, day].sort()))
  }

  const addScheduleTime = () => {
    if (scheduleTimes.length < 6) {
      setScheduleTimes([...scheduleTimes, "12:00"])
    }
  }

  const removeScheduleTime = (index: number) => {
    setScheduleTimes(scheduleTimes.filter((_, i: number) => i !== index))
  }

  const updateScheduleTime = (index: number, value: string) => {
    const newTimes = [...scheduleTimes]
    newTimes[index] = value
    setScheduleTimes(newTimes)
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-5">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">{valve.name}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{valve.zone}</p>
            </div>
            <Badge className={getStatusColor(valve.status)}>{getStatusText(valve.status)}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="metrics" className="relative z-10">
          <TabsList className="grid w-full grid-cols-2 relative z-10">
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-6">
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Filtros de Métricas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label>Rango de Tiempo</Label>
                  <Select value={metricsDateRange} onValueChange={(value: any) => setMetricsDateRange(value)}>
                    <SelectTrigger className="relative z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-100">
                      <SelectItem value="week">Última Semana</SelectItem>
                      <SelectItem value="month">Último Mes</SelectItem>
                      <SelectItem value="year">Último Año</SelectItem>
                      <SelectItem value="custom">Rango Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {metricsDateRange === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Fecha Inicio</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e: any) => setCustomStartDate(e.target.value)}
                        className="relative z-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">Fecha Fin</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e: any) => setCustomEndDate(e.target.value)}
                        className="relative z-10"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Estado Actual
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Caudal Actual</p>
                  <p className="text-2xl font-bold text-foreground">{valve.flowRate.toFixed(1)} L/min</p>
                  {typeof (editedValve as any)?.flowLph === 'number' && (
                    <p className="text-xs text-muted-foreground">{(editedValve as any).flowLph.toFixed(1)} L/h</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Última Activación</p>
                  <p className="text-lg font-semibold text-foreground">{valve.lastActive}</p>
                </div>
              </CardContent>
            </Card>

            {/* Water Usage Statistics */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-500" />
                  Consumo de Agua
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Últimos 7 días</p>
                    <p className="text-xl font-bold text-foreground">{loadingMetrics ? '—' : `${(metrics?.seven.liters ?? 0).toFixed(2)} L`}</p>
                    <p className="text-xs text-muted-foreground">{loadingMetrics ? '' : `${metrics?.seven.runs ?? 0} riegos`}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground mb-1">Últimos 30 días</p>
                    <p className="text-xl font-bold text-foreground">{loadingMetrics ? '—' : `${(metrics?.thirty.liters ?? 0).toFixed(2)} L`}</p>
                    <p className="text-xs text-muted-foreground">{loadingMetrics ? '' : `${metrics?.thirty.runs ?? 0} riegos`}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">Último Riego</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {loadingMetrics ? '—' : `${(metrics?.lastRun?.liters ?? 0).toFixed(2)} L`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Realizado: {loadingMetrics ? '—' : (metrics?.lastRun?.ts ? new Date(metrics.lastRun.ts).toLocaleString() : '—')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Information */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Horarios Programados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {valve.scheduledTimes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {valve.scheduledTimes.map((time, index) => (
                      <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                        {time}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay horarios programados</p>
                )}
              </CardContent>
            </Card>

            {/* Flow Rate History */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Caudal Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Caudal promedio histórico</span>
                    <span className="text-lg font-semibold text-foreground">
                      {loadingMetrics
                        ? '—'
                        : ((metrics?.thirty?.durationMs ?? 0) > 0
                          ? (metrics!.thirty.liters / ((metrics!.thirty.durationMs) / 60000)).toFixed(1) + ' L/min'
                          : '—')}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    {(() => {
                      const avg = (metrics?.thirty?.durationMs ?? 0) > 0
                        ? (metrics!.thirty.liters / (metrics!.thirty.durationMs / 60000))
                        : 0
                      // Compare average vs live flow when available (fallback keeps bar subtle if no data)
                      const live = typeof (editedValve as any)?.flowLph === 'number' ? ((editedValve as any).flowLph / 60) : 0
                      const denom = Math.max(avg, live, 0.01)
                      const pct = Math.max(0, Math.min(100, Math.round((avg / denom) * 100)))
                      return <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4 mt-6">
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg">Configuración General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label htmlFor="valve-name">Nombre de la Válvula</Label>
                  <Input
                    id="valve-name"
                    value={editedValve.name}
                    onChange={(e) => setEditedValve({ ...editedValve, name: e.target.value })}
                    className="relative z-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valve-zone">Zona</Label>
                  <Input
                    id="valve-zone"
                    value={editedValve.zone}
                    onChange={(e) => setEditedValve({ ...editedValve, zone: e.target.value })}
                    className="relative z-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valve-enabled">Habilitación</Label>
                  <Select
                    value={enabled ? 'on' : 'off'}
                    onValueChange={(value: 'on' | 'off') => setEnabled(value === 'on')}
                  >
                    <SelectTrigger id="valve-enabled" className="relative z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-100">
                      <SelectItem value="on">Habilitada</SelectItem>
                      <SelectItem value="off">Deshabilitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Water Amount Configuration */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Waves className="w-5 h-5 text-cyan-500" />
                  Cantidad de Agua por Riego
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Select
                    value={editedValve.waterUnit}
                    onValueChange={(value: "L" | "ml") => setEditedValve({ ...editedValve, waterUnit: value })}
                  >
                    <SelectTrigger className="relative z-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-100">
                      <SelectItem value="L">Litros (L)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>
                      Cantidad: {editedValve.waterAmount} {editedValve.waterUnit}
                    </Label>
                  </div>
                  <Slider
                    value={[editedValve.waterAmount]}
                    onValueChange={([value]) => setEditedValve({ ...editedValve, waterAmount: value })}
                    min={editedValve.waterUnit === "L" ? 1 : 100}
                    max={editedValve.waterUnit === "L" ? 200 : 5000}
                    step={editedValve.waterUnit === "L" ? 1 : 50}
                    className="w-full relative z-10"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{editedValve.waterUnit === "L" ? "1 L" : "100 ml"}</span>
                    <span>{editedValve.waterUnit === "L" ? "200 L" : "5000 ml"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {hasConfig && (
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Programación de Riego
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                {!hasValveJobs && (
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border text-sm text-muted-foreground flex items-center justify-between">
                    <span>No hay una programación guardada para esta válvula.</span>
                    <Button type="button" variant="outline" className="bg-transparent" onClick={() => setHasValveJobs(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Agregar programación
                    </Button>
                  </div>
                )}

                {hasValveJobs && (
                  <>
                    {/* Schedule Mode Selection */}
                    <div className="space-y-2">
                      <Label>Modo de Programación</Label>
                      <Select value={scheduleMode} onValueChange={(value: any) => setScheduleMode(value)}>
                        <SelectTrigger className="relative z-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-100">
                          <SelectItem value="daily">Diario</SelectItem>
                          <SelectItem value="weekly">Semanal (Días Específicos)</SelectItem>
                          <SelectItem value="interval">Por Intervalo</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Daily Mode */}
                    {scheduleMode === "daily" && (
                      <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                        <p className="text-sm text-muted-foreground">Riego todos los días a las horas especificadas</p>
                        <div className="space-y-3">
                          {scheduleTimes.map((time, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={time}
                                onChange={(e) => updateScheduleTime(index, e.target.value)}
                                className="relative z-10"
                              />
                              {scheduleTimes.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeScheduleTime(index)}
                                  className="relative z-10"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {scheduleTimes.length < 6 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addScheduleTime}
                              className="w-full relative z-10 bg-transparent"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar Horario
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Weekly Mode */}
                    {scheduleMode === "weekly" && (
                      <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                        <p className="text-sm text-muted-foreground">Selecciona los días de la semana</p>
                        <div className="grid grid-cols-7 gap-2">
                          {dayNames.map((day, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant={selectedDays.includes(index) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleDay(index)}
                              className="relative z-10 p-2 h-auto"
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                        <div className="space-y-2 mt-4">
                          <Label htmlFor="weekly-time">Hora de Riego</Label>
                          <Input
                            id="weekly-time"
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="relative z-10"
                          />
                        </div>
                      </div>
                    )}

                    {/* Interval Mode */}
                    {scheduleMode === "interval" && (
                      <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                        <p className="text-sm text-muted-foreground">Riego cada cierto intervalo de tiempo</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="interval-days">Días</Label>
                            <Input
                              id="interval-days"
                              type="number"
                              min="0"
                              max="30"
                              value={intervalDays}
                              onChange={(e) => setIntervalDays(Number(e.target.value))}
                              className="relative z-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="interval-hours">Horas</Label>
                            <Input
                              id="interval-hours"
                              type="number"
                              min="0"
                              max="23"
                              value={intervalHours}
                              onChange={(e) => setIntervalHours(Number(e.target.value))}
                              className="relative z-10"
                            />
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-sm font-medium text-foreground">
                            Frecuencia: Cada {intervalDays > 0 && `${intervalDays} día${intervalDays > 1 ? "s" : ""}`}
                            {intervalDays > 0 && intervalHours > 0 && " y "}
                            {intervalHours > 0 && `${intervalHours} hora${intervalHours > 1 ? "s" : ""}`}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interval-start-time">Hora de Inicio</Label>
                          <Input
                            id="interval-start-time"
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="relative z-10"
                          />
                        </div>
                        {/* Optional: multiple times per watering day */}
                        <div className="space-y-2">
                          <Label className="mb-1 block">Horarios (en día de riego, opcional)</Label>
                          <div className="space-y-3">
                            {scheduleTimes.map((time, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={time}
                                  onChange={(e) => updateScheduleTime(index, e.target.value)}
                                  className="relative z-10"
                                />
                                {scheduleTimes.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeScheduleTime(index)}
                                    className="relative z-10"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {scheduleTimes.length < 6 && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={addScheduleTime}
                                className="w-full relative z-10 bg-transparent"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Horario
                              </Button>
                            )}
                            <p className="text-xs text-muted-foreground">Ejemplo: cada 2 días a las 08:00 y 15:00.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Mode */}
                    {scheduleMode === "custom" && (
                      <div className="space-y-4 p-4 rounded-lg bg-secondary/30">
                        <p className="text-sm text-muted-foreground">
                          Configuración avanzada: combina días específicos con múltiples horarios
                        </p>
                        <div className="space-y-4">
                          <div>
                            <Label className="mb-2 block">Días de la Semana</Label>
                            <div className="grid grid-cols-7 gap-2">
                              {dayNames.map((day, index) => (
                                <Button
                                  key={index}
                                  type="button"
                                  variant={selectedDays.includes(index) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleDay(index)}
                                  className="relative z-10 p-2 h-auto"
                                >
                                  {day}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="mb-2 block">Horarios</Label>
                            <div className="space-y-3">
                              {scheduleTimes.map((time, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => updateScheduleTime(index, e.target.value)}
                                    className="relative z-10"
                                  />
                                  {scheduleTimes.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeScheduleTime(index)}
                                      className="relative z-10"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              {scheduleTimes.length < 6 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={addScheduleTime}
                                  className="w-full relative z-10 bg-transparent"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Agregar Horario
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            )}

            {/* Test Button */}
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-primary" />
                  Prueba de Válvula
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <Button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || enabled === false}
                  className="w-full bg-transparent relative z-10"
                  variant="outline"
                >
                  {isTesting ? "Probando..." : "Probar Válvula"}
                </Button>
                {isTesting && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    La válvula se activará por 3 segundos
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button type="button" onClick={handleSave} className="w-full gradient-primary relative z-10" size="lg">
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
