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
  schedule: {
    days: string[]
    startTime: string
    duration: number
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
        days: ["Lun", "Mié", "Vie"],
        startTime: "06:00",
        duration: 30,
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
        days: ["Lun", "Mié", "Vie", "Dom"],
        startTime: "06:00",
        duration: 45,
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
        days: ["Mar", "Jue", "Sáb"],
        startTime: "18:00",
        duration: 30,
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
      zone: "Césped Principal",
      enabled: true,
      schedule: {
        days: ["Lun", "Mié", "Vie", "Dom"],
        startTime: "18:00",
        duration: 60,
      },
      flowRate: {
        min: 12,
        max: 25,
        target: 18,
      },
      sensors: {
        moisture: true,
        temperature: true,
        rain: true,
      },
    },
    {
      id: "v5",
      name: "Válvula 5",
      zone: "Macetas",
      enabled: true,
      schedule: {
        days: ["Lun", "Mié", "Vie", "Dom"],
        startTime: "07:00",
        duration: 15,
      },
      flowRate: {
        min: 3,
        max: 8,
        target: 5,
      },
      sensors: {
        moisture: true,
        temperature: false,
        rain: false,
      },
    },
    {
      id: "v6",
      name: "Válvula 6",
      zone: "Invernadero",
      enabled: false,
      schedule: {
        days: ["Lun", "Mar", "Mié", "Jue", "Vie"],
        startTime: "08:00",
        duration: 30,
      },
      flowRate: {
        min: 6,
        max: 15,
        target: 10,
      },
      sensors: {
        moisture: true,
        temperature: true,
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
          <p className="text-sm text-muted-foreground mt-1">Configura horarios, caudales y sensores para cada zona</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Plus className="w-4 h-4" />
          Agregar Válvula
        </Button>
      </div>

      <div className="space-y-4">
        {configs.map((config) => (
          <ValveConfigCard key={config.id} config={config} onUpdate={(updates) => updateConfig(config.id, updates)} />
        ))}
      </div>
    </div>
  )
}
