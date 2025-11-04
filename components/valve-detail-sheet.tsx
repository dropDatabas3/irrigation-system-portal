"use client"

import { useState, useEffect } from "react"
import { sendCmd } from "@/lib/api"
import { toDeviceValve } from "@/lib/valves"
import { buildJobs } from "@/lib/schedule"
import { fetchConfigDedupe } from "@/lib/config-client"
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
  onSelectValveId?: (id: string) => void
  enabledValveIds?: string[]
}

export function ValveDetailSheet({ valve, open, onOpenChange, onUpdate, onSelectValveId, enabledValveIds }: ValveDetailSheetProps) {
  const [editedValve, setEditedValve] = useState(valve)
  const [isTesting, setIsTesting] = useState(false)
  // Control de habilitación separado del estado de ejecución (activa/inactiva)
  const [enabled, setEnabled] = useState<boolean>(valve.enabled !== false)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState<string | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<null | {
    lastRun: { ts: number; liters: number; durationMs: number } | null
    seven: { liters: number; durationMs: number; runs: number }
    thirty: { liters: number; durationMs: number; runs: number }
  }>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [hasConfig, setHasConfig] = useState<boolean>(false)
  const [hasValveJobs, setHasValveJobs] = useState<boolean>(false)
  const [configFetched, setConfigFetched] = useState(false)

  const [scheduleMode, setScheduleMode] = useState<"daily" | "weekly" | "interval" | "custom">("daily")
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]) // 0=Domingo, 1=Lunes, etc.
  const [intervalDays, setIntervalDays] = useState(2)
  const [intervalHours, setIntervalHours] = useState(0)
  const [scheduleTime, setScheduleTime] = useState("08:00")
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["08:00", "18:00"])
  const [consecutiveWaterings, setConsecutiveWaterings] = useState(1)
  const [wateringIntervalMinutes, setWateringIntervalMinutes] = useState(3)

  const [metricsDateRange, setMetricsDateRange] = useState<"week" | "month" | "year" | "custom">("week")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  // Profiles & schedule tools
  const [profiles, setProfiles] = useState<Array<{ name: string; schedule: any }>>([])
  const [profileName, setProfileName] = useState("")
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [appliedProfileName, setAppliedProfileName] = useState<string | null>(null)
  const [originalScheduleJson, setOriginalScheduleJson] = useState<string | null>(null)
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null)

  // Load per-valve metrics
  const deviceValve = toDeviceValve(valve.id as any)
  // Sync local state when valve prop changes or sheet opens
  useEffect(() => {
    console.log('[valve-detail-sheet] valve changed to', valve.id, 'open:', open)
    setEditedValve(valve)
    setEnabled(valve.enabled !== false)
    // Reset form state when valve changes to prevent stale data
    setScheduleMode('daily')
    setSelectedDays([1, 3, 5])
    setScheduleTimes(['08:00', '18:00'])
    setScheduleTime('08:00')
    setIntervalDays(2)
    setIntervalHours(0)
    setConsecutiveWaterings(1)
    setWateringIntervalMinutes(3)
    setHasValveJobs(false)
    // Reset config fetch flag when sheet opens OR valve changes
    setConfigFetched(false)
  }, [valve.id, open])

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

  // Detect if there is any saved config and whether this valve has a schedule saved
  useEffect(() => {
    // Only fetch once per sheet open to avoid pending requests
    if (configFetched) {
      console.log('[sheet detection] already fetched config, skipping')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const json = await fetchConfigDedupe()
        const cfg = json?.config || {}
        const hasCfg = !!cfg && Array.isArray(cfg?.valves)
        const valvesArr: any[] = Array.isArray(cfg?.valves) ? cfg.valves : []
        const entry = valvesArr.find(v => Number(v?.id) === deviceValve)
        const hasJobsForValve = !!entry && !!entry.schedule
        if (!cancelled) {
          setHasConfig(!!hasCfg)
          setHasValveJobs(!!hasJobsForValve)
          setConfigFetched(true)
          // Populate form fields from saved schedule if available
          if (hasJobsForValve && entry.schedule) {
            const sch = entry.schedule
            console.log('[sheet detection] loaded schedule for valve', deviceValve, ':', JSON.stringify(sch))
            setScheduleMode(sch.mode || 'daily')
            if (sch.days && Array.isArray(sch.days)) setSelectedDays(sch.days)
            if (sch.times && Array.isArray(sch.times)) setScheduleTimes(sch.times)
            if (sch.startTime) setScheduleTime(sch.startTime)
            if (Number.isFinite(sch.intervalDays)) setIntervalDays(Number(sch.intervalDays))
            if (Number.isFinite(sch.intervalHours)) setIntervalHours(Number(sch.intervalHours))
            if (Number.isFinite(sch.consecutiveWaterings)) setConsecutiveWaterings(Number(sch.consecutiveWaterings))
            if (Number.isFinite(sch.wateringIntervalMinutes)) setWateringIntervalMinutes(Number(sch.wateringIntervalMinutes))
            if (Number.isFinite(sch.liters)) {
              // Load water amount and determine appropriate unit
              const liters = Number(sch.liters)
              if (liters < 1) {
                // Use ml for amounts under 1L
                setEditedValve(prev => ({ ...prev, waterAmount: Math.round(liters * 1000), waterUnit: 'ml' }))
              } else {
                // Use L for 1L and above
                setEditedValve(prev => ({ ...prev, waterAmount: liters, waterUnit: 'L' }))
              }
            }
          } else {
            console.log('[sheet detection] no schedule found for valve', deviceValve)
          }
          // Build initial snapshot for dirty tracking
          const initSched = (hasJobsForValve && entry?.schedule) ? entry.schedule : undefined
          const snap = JSON.stringify({
            enabled: valve.enabled !== false,
            name: valve.name ?? '',
            zone: valve.zone ?? '',
            schedule: initSched || null,
          })
          setInitialSnapshot(snap)
          setAppliedProfileName(null)
          setOriginalScheduleJson(initSched ? JSON.stringify(initSched) : null)
        }
      } catch (err) {
        console.error('[sheet detection] failed:', err)
        if (!cancelled) { setHasConfig(false); setHasValveJobs(false); setConfigFetched(true) }
      }
    })()
    return () => { cancelled = true }
  }, [deviceValve, open]) // ❌ REMOVED configFetched from deps to avoid infinite loop

  // Load profiles when opening config tab for this valve
  useEffect(() => {
    let cancelled = false
    if (!open) return
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
  }, [open])

  const buildSchedulePayload = () => {
    // Construir un objeto "schedule" compatible con el API (normalizeSchedule)
    // ALWAYS store in LITERS (convert ml to L if needed)
    let litersValue = Number(editedValve.waterAmount) || 0
    if (editedValve.waterUnit === 'ml') {
      litersValue = litersValue / 1000 // Convert ml to L
    }
    console.log('[buildSchedulePayload] mode:', scheduleMode, 'waterAmount:', editedValve.waterAmount, editedValve.waterUnit, '=> liters:', litersValue)
    
    if (scheduleMode === 'daily') {
      return { mode: 'daily', times: (scheduleTimes.length ? scheduleTimes : ['08:00']).slice(0, 6), liters: litersValue }
    }
    if (scheduleMode === 'weekly') {
      return { mode: 'weekly', days: selectedDays, startTime: scheduleTime || '08:00', liters: litersValue }
    }
    if (scheduleMode === 'interval') {
      const payload: any = {
        mode: 'interval',
        intervalDays: Number(intervalDays) || 0,
        intervalHours: Number(intervalHours) || 0,
        startTime: scheduleTime || '08:00',
        liters: litersValue,
      }
      if (scheduleTimes && scheduleTimes.length) payload.times = scheduleTimes.slice(0, 6)
      if (consecutiveWaterings > 1) {
        payload.consecutiveWaterings = consecutiveWaterings
        payload.wateringIntervalMinutes = wateringIntervalMinutes
      }
      return payload
    }
    if (scheduleMode === 'custom') {
      return { mode: 'custom', days: selectedDays, times: (scheduleTimes.length ? scheduleTimes : ['08:00']).slice(0, 6), liters: litersValue }
    }
    return undefined
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveOk(null)
    setSaveErr(null)
    try {
      console.log('[handleSave] enabled:', enabled, 'hasValveJobs:', hasValveJobs)
      // 1) Update UI state immediately
      onUpdate(editedValve)

  // 2) Construir schedule para esta válvula (persistencia en DB)
  const schedule = hasValveJobs ? buildSchedulePayload() : undefined
      console.log('[handleSave] schedule to save:', JSON.stringify(schedule))

      // 3) Merge with existing config so we don't wipe other valves' schedules/metadata
      let baseJobs: any[] = []
      let baseValves: Array<{ id: number; enabled?: boolean; name?: string; zone?: string; schedule?: any }> = []
      try {
        const data = await fetchConfigDedupe()
        if (data?.ok) {
          const cfg = data?.config
          const arr = Array.isArray(cfg?.jobs) ? cfg.jobs : []
          // keep jobs for other valves only (si existieran en futuras versiones)
          baseJobs = arr.filter((j: any) => Number(j?.valve) !== toDeviceValve(editedValve.id as any))
          const valvesArr: Array<any> = Array.isArray(cfg?.valves) ? cfg.valves : []
          // keep valves metadata for other valves only
          baseValves = valvesArr.filter((v: any) => Number(v?.id) !== toDeviceValve(editedValve.id as any))
        }
      } catch {}

      const merged = [...baseJobs]
      merged.sort((a: any, b: any) => (a?.at || 0) - (b?.at || 0))

      // 4) Build valves array update for this valve (habilitada/deshabilitada + nombre/zona)
      const devValve = toDeviceValve(editedValve.id as any)
      const updatedValves = [
        ...baseValves,
        { id: devValve, enabled, name: editedValve.name, zone: editedValve.zone, schedule },
      ]
      console.log('[handleSave] sending valves:', JSON.stringify(updatedValves))

      // 5) Send config/set with merged jobs and valves (with timeout)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout for save
      try {
        const postRes = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobs: merged, valves: updatedValves, tzOffsetMinutes: -new Date().getTimezoneOffset() }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const ok = postRes.ok
        if (ok) {
          setSaveOk(hasValveJobs ? 'Rutina creada correctamente' : 'Cambios guardados')
          console.log('[handleSave] success')
          // Reset dirty baseline
          const snap = JSON.stringify({ enabled, name: editedValve.name ?? '', zone: editedValve.zone ?? '', schedule: schedule || null })
          setInitialSnapshot(snap)
          if (appliedProfileName) setOriginalScheduleJson(schedule ? JSON.stringify(schedule) : null)
          // Opción: cerrar automáticamente después de una breve confirmación
          // setTimeout(() => onOpenChange(false), 800)
        } else {
          const j = await postRes.json().catch(() => null)
          throw new Error(j?.error || 'Error al guardar la configuración')
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        throw fetchErr
      }
    } catch (e) {
      console.error('[handleSave] save valve config failed', e)
      setSaveErr((e as any)?.message || 'Error al guardar')
    } finally {
      setSaving(false)
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

  const handleClearSchedule = async () => {
    try {
      const idStr = String(valve.id)
      const res = await fetch(`/api/valves/${idStr}/clear-schedule`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'No se pudo borrar la rutina')
      setHasValveJobs(false)
      setSaveOk('Rutina borrada')
    } catch (e) {
      setSaveErr((e as any)?.message || 'Error al borrar la rutina')
    }
  }

  const handleSaveProfile = async () => {
    try {
      const schedule = buildSchedulePayload()
      if (!schedule) throw new Error('No hay una programación para guardar')
      const name = profileName.trim()
      if (!name) throw new Error('Ingrese un nombre para el perfil')
      const res = await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, schedule }) })
      const j = await res.json()
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'No se pudo guardar el perfil')
      setProfiles((prev) => {
        const idx = prev.findIndex((p) => p.name === name)
        const next = [...prev]
        if (idx >= 0) next[idx] = { name, schedule }
        else next.push({ name, schedule })
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setProfileName('')
      setSaveOk('Perfil guardado')
    } catch (e) {
      setSaveErr((e as any)?.message || 'Error al guardar perfil')
    }
  }

  const handleApplyProfile = async (name: string) => {
    try {
      const idStr = String(valve.id)
      const res = await fetch(`/api/valves/${idStr}/apply-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const j = await res.json()
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'No se pudo aplicar el perfil')
      // Also load profile to UI form so user sees it
      const p = profiles.find((p) => p.name === name)
      if (p?.schedule) {
        const sch = p.schedule
        setHasValveJobs(true)
        setScheduleMode(sch.mode || 'daily')
        if (sch.days && Array.isArray(sch.days)) setSelectedDays(sch.days)
        if (sch.times && Array.isArray(sch.times)) setScheduleTimes(sch.times)
        if (sch.startTime) setScheduleTime(sch.startTime)
        if (Number.isFinite(sch.intervalDays)) setIntervalDays(Number(sch.intervalDays))
        if (Number.isFinite(sch.intervalHours)) setIntervalHours(Number(sch.intervalHours))
        if (Number.isFinite(sch.consecutiveWaterings)) setConsecutiveWaterings(Number(sch.consecutiveWaterings))
        if (Number.isFinite(sch.wateringIntervalMinutes)) setWateringIntervalMinutes(Number(sch.wateringIntervalMinutes))
        if (Number.isFinite(sch.liters)) {
          const liters = Number(sch.liters)
          if (liters < 1) setEditedValve((prev) => ({ ...prev, waterAmount: Math.round(liters * 1000), waterUnit: 'ml' }))
          else setEditedValve((prev) => ({ ...prev, waterAmount: liters, waterUnit: 'L' }))
        }
      }
      setAppliedProfileName(name)
      setOriginalScheduleJson(p?.schedule ? JSON.stringify(p.schedule) : null)
      setSaveOk('Perfil aplicado')
    } catch (e) {
      setSaveErr((e as any)?.message || 'Error al aplicar perfil')
    }
  }

  // Dirty tracking
  const currentSchedule = hasValveJobs ? buildSchedulePayload() : undefined
  const currentSnapshot = JSON.stringify({
    enabled,
    name: editedValve.name ?? '',
    zone: editedValve.zone ?? '',
    schedule: currentSchedule || null,
  })
  const isDirty = initialSnapshot ? initialSnapshot !== currentSnapshot : false
  const scheduleJson = currentSchedule ? JSON.stringify(currentSchedule) : null
  const scheduleModifiedFromProfile = appliedProfileName && originalScheduleJson && scheduleJson && originalScheduleJson !== scheduleJson

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
        {/* Selector de válvula (solo válvulas habilitadas). La seleccionada se expande */}
        <div className="mb-4 flex items-center gap-2">
          {(enabledValveIds && enabledValveIds.length ? enabledValveIds : [valve.id]).map((id) => {
            const selected = valve.id === id
            const labelShort = id.toUpperCase() // V1, V2...
            const num = id.replace(/^v/i, '')
            const labelLong = `Válvula ${num}`
            return (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className={selected ? 'gradient-primary' : ''}
                onClick={() => onSelectValveId && onSelectValveId(id)}
              >
                {selected ? labelLong : labelShort}
              </Button>
            )
          })}
        </div>
        {/* Hidden title for a11y to satisfy Radix Dialog requirement */}
        {(() => {
          const num = String(valve.id).replace(/^v/i, '')
          const hiddenTitle = `Válvula ${num}`
          return <SheetTitle className="sr-only">{hiddenTitle}</SheetTitle>
        })()}

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

            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Programación de Riego
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Cargar perfil de riego</Label>
                      <Select disabled={loadingProfiles || profiles.length === 0} onValueChange={(v: any) => v && handleApplyProfile(v)}>
                        <SelectTrigger className="relative z-10">
                          <SelectValue placeholder={loadingProfiles ? 'Cargando…' : (profiles.length ? 'Elegir perfil' : 'Sin perfiles')} />
                        </SelectTrigger>
                        <SelectContent className="z-100 max-h-64 overflow-auto">
                          {profiles.map((p) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(hasValveJobs && (!appliedProfileName || scheduleModifiedFromProfile)) && (
                      <div className="space-y-2">
                        <Label>Guardar perfil de riego</Label>
                        <div className="flex gap-2">
                          <Input placeholder="Nombre" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                          <Button type="button" variant="outline" onClick={handleSaveProfile} className="bg-transparent">Guardar</Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Borrar rutina</Label>
                      <Button type="button" variant="destructive" onClick={handleClearSchedule}>Borrar</Button>
                    </div>
                  </div>
                </div>

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
                    {/* Water Amount Configuration - Moved inside schedule block */}
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Waves className="w-5 h-5 text-cyan-500" />
                        <span className="text-sm font-semibold text-foreground">Cantidad de Agua por Riego</span>
                      </div>
                      <div className="space-y-4">
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
                      </div>
                    </div>

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
                        
                        {/* Consecutive waterings configuration */}
                        <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-3">
                          <p className="text-sm font-medium text-foreground">Riegos Consecutivos (opcional)</p>
                          <p className="text-xs text-muted-foreground">
                            Configura múltiples riegos seguidos cada vez que se cumple el intervalo
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="consecutive-waterings">Cantidad de Riegos</Label>
                              <Input
                                id="consecutive-waterings"
                                type="number"
                                min="1"
                                max="10"
                                value={consecutiveWaterings}
                                onChange={(e) => setConsecutiveWaterings(Number(e.target.value))}
                                className="relative z-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="watering-interval">Intervalo (minutos)</Label>
                              <Input
                                id="watering-interval"
                                type="number"
                                min="1"
                                max="60"
                                value={wateringIntervalMinutes}
                                onChange={(e) => setWateringIntervalMinutes(Number(e.target.value))}
                                className="relative z-10"
                                disabled={consecutiveWaterings <= 1}
                              />
                            </div>
                          </div>
                          {consecutiveWaterings > 1 && (
                            <div className="p-2 rounded bg-primary/10 text-xs text-foreground">
                              Se realizarán <strong>{consecutiveWaterings} riegos</strong> separados por{" "}
                              <strong>{wateringIntervalMinutes} minutos</strong> cada vez que se cumpla el intervalo de{" "}
                              {intervalDays > 0 && `${intervalDays} día${intervalDays > 1 ? "s" : ""}`}
                              {intervalDays > 0 && intervalHours > 0 && " y "}
                              {intervalHours > 0 && `${intervalHours} hora${intervalHours > 1 ? "s" : ""}`}
                            </div>
                          )}
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

            {/* Save feedback */}
            {(saveOk || saveErr) && (
              <div className={`mt-1 text-sm rounded border px-3 py-2 ${saveOk ? 'text-emerald-300 bg-emerald-900/20 border-emerald-800' : 'text-red-300 bg-red-900/20 border-red-800'}`}>
                {saveOk || saveErr}
              </div>
            )}

            {/* Save Button */}
            <Button type="button" onClick={handleSave} className="w-full gradient-primary relative z-10" size="lg" disabled={saving || !isDirty}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando…' : (isDirty ? 'Guardar Cambios' : 'Sin cambios')}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
