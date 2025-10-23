"use client"

import { useState } from "react"
import { ValveCard } from "@/components/valve-card"
import { ValveDetailSheet } from "@/components/valve-detail-sheet"

export interface Valve {
  id: string
  name: string
  zone: string
  status: "active" | "inactive" | "off"
  flowRate: number
  lastActive: string
  schedule?: string
  waterAmount: number
  waterUnit: "L" | "ml"
  totalWaterUsed: number
  averagePerDay: number
  averagePerWeek: number
  averagePerMonth: number
  averagePerIrrigation: number
  scheduledTimes: string[]
}

export function ValveGrid() {
  const [valves, setValves] = useState<Valve[]>([
    {
      id: "v1",
      name: "Válvula 1",
      zone: "Jardín Frontal",
      status: "active",
      flowRate: 12.5,
      lastActive: "Hace 5 min",
      schedule: "06:00 - 06:30",
      waterAmount: 50,
      waterUnit: "L",
      totalWaterUsed: 1250,
      averagePerDay: 50,
      averagePerWeek: 350,
      averagePerMonth: 1500,
      averagePerIrrigation: 50,
      scheduledTimes: ["06:00", "18:00"],
    },
    {
      id: "v2",
      name: "Válvula 2",
      zone: "Jardín Trasero",
      status: "active",
      flowRate: 15.2,
      lastActive: "Hace 3 min",
      schedule: "06:00 - 06:45",
      waterAmount: 75,
      waterUnit: "L",
      totalWaterUsed: 2100,
      averagePerDay: 75,
      averagePerWeek: 525,
      averagePerMonth: 2250,
      averagePerIrrigation: 75,
      scheduledTimes: ["06:00", "19:00"],
    },
    {
      id: "v3",
      name: "Válvula 3",
      zone: "Huerto",
      status: "off",
      flowRate: 0,
      lastActive: "Nunca",
      waterAmount: 30,
      waterUnit: "L",
      totalWaterUsed: 0,
      averagePerDay: 0,
      averagePerWeek: 0,
      averagePerMonth: 0,
      averagePerIrrigation: 0,
      scheduledTimes: [],
    },
    {
      id: "v4",
      name: "Válvula 4",
      zone: "Césped Principal",
      status: "off",
      flowRate: 0,
      lastActive: "Nunca",
      waterAmount: 100,
      waterUnit: "L",
      totalWaterUsed: 0,
      averagePerDay: 0,
      averagePerWeek: 0,
      averagePerMonth: 0,
      averagePerIrrigation: 0,
      scheduledTimes: [],
    },
  ])

  const [selectedValve, setSelectedValve] = useState<Valve | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const toggleValve = (id: string) => {
    setValves(
      valves.map((valve) => {
        if (valve.id === id) {
          const newStatus = valve.status === "active" ? "inactive" : "active"
          return {
            ...valve,
            status: newStatus,
            flowRate: newStatus === "active" ? Math.random() * 20 + 10 : 0,
            lastActive: newStatus === "active" ? "Ahora" : valve.lastActive,
          }
        }
        return valve
      }),
    )
  }

  const openValveDetails = (valve: Valve) => {
    setSelectedValve(valve)
    setIsSheetOpen(true)
  }

  const updateValve = (updatedValve: Valve) => {
    setValves(valves.map((v) => (v.id === updatedValve.id ? updatedValve : v)))
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Control de Válvulas</h2>
            <p className="text-sm text-muted-foreground mt-1">Gestiona cada zona de riego individualmente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {valves.map((valve) => (
            <ValveCard
              key={valve.id}
              valve={valve}
              onToggle={() => toggleValve(valve.id)}
              onClick={() => openValveDetails(valve)}
            />
          ))}
        </div>
      </div>

      {selectedValve && (
        <ValveDetailSheet
          valve={selectedValve}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onUpdate={updateValve}
        />
      )}
    </>
  )
}
