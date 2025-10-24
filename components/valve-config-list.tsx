"use client"

import { useState } from "react"
import { ValveConfigCard } from "@/components/valve-config-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export interface ValveConfig {
  id: string
  name: string
  zone: string
  enabled: boolean
  lockedDisabled?: boolean
  disabledReason?: string
  schedule: {
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
      schedule: {
        mode: 'daily',
        days: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
        times: ["06:00"],
      },
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
      schedule: {
        mode: 'weekly',
        days: ["Lun", "Mié", "Vie", "Dom"],
        startTime: "06:00",
      },
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
      schedule: {
        mode: 'interval',
        days: [],
        intervalDays: 2,
        intervalHours: 0,
        startTime: "18:00",
      },
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
      schedule: {
        mode: 'weekly',
        days: ["Lun", "Mié", "Vie"],
        startTime: "18:00",
      },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuración de Válvulas</h2>
          <p className="text-sm text-muted-foreground mt-1">Configura horarios, caudales y sensores para cada zona. El sistema admite 4 válvulas; la V4 se encuentra deshabilitada por hardware.</p>
        </div>
        <div className="text-xs text-muted-foreground">Total: 4 válvulas</div>
      </div>

      <div className="space-y-4">
        {configs.map((config) => (
          <ValveConfigCard key={config.id} config={config} onUpdate={(updates) => updateConfig(config.id, updates)} />
        ))}
      </div>
    </div>
  )
}
