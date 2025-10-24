"use client"

import { useEffect, useMemo, useState } from "react"
import { ValveCard } from "@/components/valve-card"
import { ValveDetailSheet } from "@/components/valve-detail-sheet"
import { sendCmd } from "@/lib/api"
import { toDeviceValve } from "@/lib/valves"
import { useIrrigationEvents } from "@/lib/useEvents"

export interface Valve {
  id: string
  name: string
  zone: string
  status: "active" | "inactive" | "off"
  flowRate: number
  flowLph?: number
  runLiters?: number
  runTargetLiters?: number
  runMsElapsed?: number
  lastActive: string
  schedule?: string
  nextAtSec?: number
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
  const { lastConfigAck, events, lastStatus } = useIrrigationEvents()
  // tick to force periodic re-render for countdowns
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) & 0xffff), 1000)
    return () => clearInterval(id)
  }, [])
  const [valves, setValves] = useState<Valve[]>([
    {
      id: "v1",
      name: "Válvula 1",
      zone: "Jardín Frontal",
      status: "inactive",
      flowRate: 0,
      lastActive: "-",
      schedule: undefined,
      waterAmount: 10,
      waterUnit: "L",
      totalWaterUsed: 0,
      averagePerDay: 0,
      averagePerWeek: 0,
      averagePerMonth: 0,
      averagePerIrrigation: 0,
      scheduledTimes: [],
    },
    {
      id: "v2",
      name: "Válvula 2",
      zone: "Jardín Trasero",
      status: "inactive",
      flowRate: 0,
      lastActive: "-",
      schedule: undefined,
      waterAmount: 10,
      waterUnit: "L",
      totalWaterUsed: 0,
      averagePerDay: 0,
      averagePerWeek: 0,
      averagePerMonth: 0,
      averagePerIrrigation: 0,
      scheduledTimes: [],
    },
    {
      id: "v3",
      name: "Válvula 3",
      zone: "Huerto",
      status: "inactive",
      flowRate: 0,
      lastActive: "-",
      schedule: undefined,
      waterAmount: 10,
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
      zone: "Reservada (hardware)",
      status: "off",
      flowRate: 0,
      lastActive: "-",
      schedule: undefined,
      waterAmount: 10,
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

  // Update lastActive timestamp when a result event arrives
  useEffect(() => {
    if (!events?.length) return
    const lastEvt = events[events.length - 1] as any
    if (lastEvt?.type !== 'result') return
    const v = Number(lastEvt?.payload?.valve)
    if (!Number.isFinite(v) || v <= 0) return
    const id = v === 1 ? 'v1' : v === 2 ? 'v2' : v === 3 ? 'v3' : `v${v}`
    const when = new Date().toLocaleString()
    setValves((prev) => prev.map((valve) => (valve.id === id ? { ...valve, lastActive: when } : valve)))
  }, [events])

  // Reflect live running valve status from lastStatus.runningValve and live progress/flow
  useEffect(() => {
    const s: any = lastStatus || {}
    const rv = s?.runningValve
    const flowLph = typeof s?.flowLph === 'number' ? s.flowLph : undefined
    const runLiters = typeof s?.runLiters === 'number' ? s.runLiters : undefined
    const runTargetLiters = typeof s?.runTargetLiters === 'number' ? s.runTargetLiters : undefined
    const runMsElapsed = typeof s?.runMsElapsed === 'number' ? s.runMsElapsed : undefined
    if (typeof rv !== 'number') return
    setValves((prev) => prev.map((v) => {
      if (v.status === 'off') return v
      const thisNum = v.id === 'v1' ? 1 : v.id === 'v2' ? 2 : v.id === 'v3' ? 3 : 0
      const active = (rv > 0 && thisNum === rv)
      const flowRateLpm = (flowLph ?? 0) / 60
      return {
        ...v,
        status: active ? 'active' : 'inactive',
        flowRate: active ? flowRateLpm : 0,
        flowLph: active ? flowLph : 0,
        runLiters: active ? runLiters : undefined,
        runTargetLiters: active ? runTargetLiters : undefined,
        runMsElapsed: active ? runMsElapsed : undefined,
      }
    }))
  }, [lastStatus])

  // When a config-ack with jobs arrives, reflect scheduled times by valve and compute next run
  useEffect(() => {
    if (!lastConfigAck) return;
    try {
      const jobs: any[] = Array.isArray(lastConfigAck?.jobs) ? lastConfigAck.jobs : [];
      if (!jobs.length) return;
  const byValve: Record<number, { labels: string[]; nextAt?: number }> = {};
      for (const j of jobs) {
        const atSec = Number(j?.at);
        const v = Number(j?.valve);
        if (!Number.isFinite(atSec) || !Number.isFinite(v)) continue;
        const d = new Date(atSec * 1000);
        const label = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const existing = byValve[v] || { labels: [] as string[] };
        existing.labels = [...existing.labels, label];
        if (!existing.nextAt || atSec < existing.nextAt) existing.nextAt = atSec;
        byValve[v] = existing;
      }
      setValves((prev) => prev.map((valve) => {
        const vNum = toDeviceValve(valve.id as any);
        const entry = byValve[vNum];
        const times = entry?.labels ?? [];
        let scheduleStr: string | undefined = undefined;
        if (entry?.nextAt) {
          const d = new Date(entry.nextAt * 1000);
          const now = new Date();
          const isToday = d.toDateString() === now.toDateString();
          const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          const isTomorrow = d.toDateString() === tomorrow.toDateString();
          const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          scheduleStr = isToday ? `Hoy ${time}` : isTomorrow ? `Mañana ${time}` : `${d.toLocaleDateString()} ${time}`;
        }
        return { ...valve, scheduledTimes: times, schedule: scheduleStr, nextAtSec: entry?.nextAt };
      }));
    } catch {}
  }, [lastConfigAck]);

  const toggleValve = async (id: string) => {
    const current = valves.find((v: Valve) => v.id === id)?.status
    const next = current === "active" ? "inactive" : "active"
    setValves(valves.map((v: Valve) => (v.id === id ? { ...v, status: next } : v)))
    try {
      const devValve = toDeviceValve(id as any)
      if (devValve === 0) return
      // If turning on, open for 5 seconds; if turning off, send alloff
      if (next === "active") {
        await sendCmd({ action: "openMs", valve: devValve, ms: 5000 })
      } else {
        await sendCmd({ action: "alloff" })
      }
    } catch (e) {
      console.error("toggleValve command failed", e)
    }
  }

  const openValveDetails = (valve: Valve) => {
    setSelectedValve(valve)
    setIsSheetOpen(true)
  }

  const updateValve = (updatedValve: Valve) => {
    setValves(valves.map((v: Valve) => (v.id === updatedValve.id ? updatedValve : v)))
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
