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
  const [configs, setConfigs] = useState<ValveConfig[]>([
    {
      id: "v1",
      name: "Válvula 1",
      zone: "Jardín Frontal",
      enabled: true,
      schedule: undefined,
      flowRate: {
        min: 8,
        max: 15,
        target: 12,
      },
      sensors: {
        moisture: true,
        temperature: false,
        rain: true,
      },
    },
    {
      id: "v2",
      name: "Válvula 2",
      zone: "Jardín Trasero",
      enabled: true,
      schedule: undefined,
      flowRate: {
        min: 10,
        max: 20,
        target: 15,
      },
      sensors: {
        moisture: true,
        temperature: true,
        rain: true,
      },
    },
    {
      id: "v3",
      name: "Válvula 3",
      zone: "Huerto",
      enabled: true,
      schedule: undefined,
      flowRate: {
        min: 5,
        max: 12,
        target: 8,
      },
      sensors: {
        moisture: true,
        temperature: false,
        rain: false,
      },
    },
    {
      id: "v4",
      name: "Válvula 4",
      zone: "Reservada",
      enabled: false,
      lockedDisabled: true,
      disabledReason: "Deshabilitada por sistema por problemas de hardware",
      schedule: undefined,
      flowRate: {
        min: 8,
        max: 15,
        target: 10,
      },
      sensors: {
        moisture: false,
        temperature: false,
        rain: false,
      },
    },
  ])

  const updateConfig = (id: string, updates: Partial<ValveConfig>) => {
    setConfigs(configs.map((config) => (config.id === id ? { ...config, ...updates } : config)))
  }

  // Load initial valves config from API to reflect persisted state
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' })
        const json = await res.json()
        const valves: Array<{ id: number; enabled?: boolean; name?: string; zone?: string }>
          = Array.isArray(json?.config?.valves) ? json.config.valves : []
        if (mounted && valves.length) {
          setConfigs(prev => prev.map(c => {
            const idNum = toDeviceValve(c.id as any)
            const v = valves.find(x => x.id === idNum)
            if (!v) return c
            // Valve 4: keep lockedDisabled regardless
            const locked = c.id === 'v4' ? true : !!c.lockedDisabled
            return {
              ...c,
              enabled: v.enabled !== false && !locked,
              name: v.name ? v.name : c.name,
              zone: v.zone ? v.zone : c.zone,
            }
          }))
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

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
        if (json?.ok) toast.success('Configuración guardada')
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuración de Válvulas</h2>
          <p className="text-sm text-muted-foreground mt-1">Configura horarios, caudales y sensores para cada zona. El sistema admite 4 válvulas; la V4 se encuentra deshabilitada por hardware.</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {(() => {
            const enabled = configs.filter(c => c.enabled && c.id !== 'v4').length
            return `Habilitadas: ${enabled} de 4`
          })()}
        </div>
      </div>

      <div className="space-y-4">
        {configs.map((config) => (
          <ValveConfigCard key={config.id} config={config} onUpdate={(updates) => updateConfig(config.id, updates)} />
        ))}
      </div>
    </div>
  )
}
