"use client"

import { useEffect, useState } from "react"
import { ValveConfigCard } from "@/components/valve-config-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { toDeviceValve } from "@/lib/valves"

export interface ValveConfig {
  id: string
  name: string
  zone: string
  enabled: boolean
  lockedDisabled?: boolean
  disabledReason?: string
  schedule?: {
    mode: 'daily' | 'weekly' | 'interval' | 'custom'
    days: string[]
    times?: string[]
    startTime?: string
    intervalDays?: number
    intervalHours?: number
    liters?: number // Water amount in liters
    consecutiveWaterings?: number // Number of consecutive waterings (1-10)
    wateringIntervalMinutes?: number // Minutes between consecutive waterings (1-60)
  }
  flowRate: {
    min: number
    max: number
    target: number
  }
  sensors: {
    moisture: boolean
    temperature: boolean
    rain: boolean
  }
}

export function ValveConfigList() {
  const [configs, setConfigs] = useState<ValveConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.config?.valves) {
          const loadedConfigs = data.config.valves.map((v: any) => ({
            id: `v${v.id}`,
            name: v.name || `Válvula ${v.id}`,
            zone: v.zone || '',
            enabled: v.enabled,
            lockedDisabled: v.id === 4, // V4 always disabled
            disabledReason: v.id === 4 ? "Deshabilitada por sistema por problemas de hardware" : undefined,
            schedule: undefined, // Schedule not loaded here
            flowRate: { min: 8, max: 15, target: 12 },
            sensors: { moisture: true, temperature: false, rain: false },
          }))
          setConfigs(loadedConfigs)
          const snap = JSON.stringify(loadedConfigs.map((c: ValveConfig) => ({ id: c.id, name: c.name, zone: c.zone, enabled: c.enabled, schedule: (c as any).schedule || null })))
          setInitialSnapshot(snap)
          window.dispatchEvent(new CustomEvent('config:dirty', { detail: false }))
        }
      })
      .catch(err => console.error('Failed to load configs:', err))
      .finally(() => setLoading(false))
  }, [])

  const updateConfig = (id: string, updates: Partial<ValveConfig>) => {
    setConfigs(configs.map((config) => (config.id === id ? { ...config, ...updates } : config)))
  }

  // Dirty tracking: compare minimal snapshot
  useEffect(() => {
    if (!initialSnapshot) return
  const snap = JSON.stringify(configs.map((c: ValveConfig) => ({ id: c.id, name: c.name, zone: c.zone, enabled: c.enabled, schedule: (c as any).schedule || null })))
    const dirty = snap !== initialSnapshot
    window.dispatchEvent(new CustomEvent('config:dirty', { detail: dirty }))
  }, [configs, initialSnapshot])

  // Handle save event from header; persist valves list to device and per-valve configs (with schedule) to DB via /api/config
  useEffect(() => {
    const onSave = async () => {
      try {
        const valves = configs.map(c => ({ id: toDeviceValve(c.id as any), enabled: c.enabled, name: c.name, zone: c.zone }))
          .filter(v => Number.isFinite(v.id) && v.id >= 1 && v.id <= 8)

        // Include full per-valve schedule for DB-only persistence (server will upsert 1 doc per valve)
        const valveConfigs = configs.map(c => ({
          id: toDeviceValve(c.id as any),
          enabled: c.enabled,
          name: c.name,
          zone: c.zone,
          schedule: c.schedule,
        })).filter(v => Number.isFinite(v.id) && v.id >= 1 && v.id <= 8)

        const payload = { valves, valveConfigs }
        const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const json = await res.json()
        if (json?.ok) {
          toast.success('Configuración guardada')
          const snap = JSON.stringify(configs.map((c: ValveConfig) => ({ id: c.id, name: c.name, zone: c.zone, enabled: c.enabled, schedule: (c as any).schedule || null })))
          setInitialSnapshot(snap)
          window.dispatchEvent(new CustomEvent('config:dirty', { detail: false }))
        }
        else toast.error('No se pudo guardar la configuración')
      } catch (e) {
        toast.error('Error al guardar la configuración')
      }
    }
    const handler = () => onSave()
    window.addEventListener('config:save', handler)
    return () => window.removeEventListener('config:save', handler)
  }, [configs])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {configs.map((config) => (
          <ValveConfigCard key={config.id} config={config} onUpdate={(updates) => updateConfig(config.id, updates)} />
        ))}
      </div>
    </div>
  )
}
