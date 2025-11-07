"use client"

import { useEffect, useMemo, useState } from "react"
import { ValveCard } from "@/components/valve-card"
import { ValveDetailSheet } from "@/components/valve-detail-sheet"
import { sendCmd } from "@/lib/api"
import { toDeviceValve } from "@/lib/valves"
import { useIrrigationEvents } from "@/lib/useEvents"
import { fetchConfigDedupe } from "@/lib/config-client"

export interface Valve {
  id: string
  name: string
  zone: string
  status: "active" | "inactive" | "off"
  enabled?: boolean
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
  // Default to all three physical valves enabled unless config says otherwise
  const [enabledSet, setEnabledSet] = useState<Set<number>>(new Set([1,2,3]))
  // tick to force periodic re-render for countdowns (only while running)
  const [tick, setTick] = useState(0)
  const isRunning = useMemo(() => {
    const s: any = lastStatus || {}
    return typeof s?.runningValve === 'number' && s.runningValve > 0
  }, [lastStatus])
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setTick((t) => (t + 1) & 0xffff), 2000)
    return () => clearInterval(id)
  }, [isRunning])
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
  const [sheetInitialTab, setSheetInitialTab] = useState<'metrics' | 'config'>('metrics')

  // Read enabled valves from last config-ack when available; fallback to API /api/config once
  useEffect(() => {
    const apply = (arr: Array<{ id: number; enabled?: boolean; name?: string; zone?: string }> | null) => {
      if (!arr || !arr.length) return
      const s = new Set<number>()
      const meta: Record<number, { name?: string; zone?: string }> = {}
      for (const v of arr) {
        const id = Number(v?.id)
        if (!Number.isFinite(id) || id === 4) continue
        if (v?.enabled) s.add(id)
        if (typeof v?.name === 'string' || typeof v?.zone === 'string') meta[id] = { name: v.name, zone: v.zone }
      }
      setEnabledSet(s)
      if (Object.keys(meta).length) {
        setValves(prev => prev.map(valve => {
          const dev = valve.id === 'v1' ? 1 : valve.id === 'v2' ? 2 : valve.id === 'v3' ? 3 : 0
          const m = meta[dev]
          return m ? { ...valve, name: m.name ?? valve.name, zone: m.zone ?? valve.zone } : valve
        }))
      }
    }
    try {
      const arr = Array.isArray((lastConfigAck as any)?.valves) ? (lastConfigAck as any).valves : null
      if (arr) apply(arr)
    } catch {}
  }, [lastConfigAck])

  useEffect(() => {
    let done = false
    ;(async () => {
      try {
        const json = await fetchConfigDedupe()
        const arr: Array<{ id: number; enabled?: boolean; name?: string; zone?: string }> = Array.isArray(json?.config?.valves) ? json.config.valves : []
        if (!done && arr.length) {
          const s = new Set<number>()
          const meta: Record<number, { name?: string; zone?: string }> = {}
          for (const v of arr) {
            const id = Number(v?.id)
            if (!Number.isFinite(id) || id === 4) continue
            if (v?.enabled) s.add(id)
            if (typeof v?.name === 'string' || typeof v?.zone === 'string') meta[id] = { name: v.name, zone: v.zone }
          }
          setEnabledSet(s)
          if (Object.keys(meta).length) {
            setValves(prev => prev.map(valve => {
              const dev = valve.id === 'v1' ? 1 : valve.id === 'v2' ? 2 : valve.id === 'v3' ? 3 : 0
              const m = meta[dev]
              return m ? { ...valve, name: m.name ?? valve.name, zone: m.zone ?? valve.zone } : valve
            }))
          }
        }
      } catch {}
    })()
    return () => { done = true }
  }, [])

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

  // Toggle enable/disable for a valve and persist via /api/config
  const toggleEnabled = async (id: string, value: boolean) => {
    try {
      const devValve = toDeviceValve(id as any)
      if (devValve === 0) return
      // Update UI immediately
      setEnabledSet(prev => {
        const s = new Set(prev)
        if (value) s.add(devValve); else s.delete(devValve)
        return s
      })
      setValves(prev => prev.map(v => v.id === id ? { ...v, enabled: value } : v))

      // Merge and POST config
      let baseValves: Array<{ id: number; enabled?: boolean; name?: string; zone?: string }> = []
      let baseJobs: any[] = []
      try {
        const res = await fetch('/api/config', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          const cfg = data?.config || {}
          baseValves = Array.isArray(cfg?.valves) ? cfg.valves : []
          baseJobs = Array.isArray(cfg?.jobs) ? cfg.jobs : []
        }
      } catch {}

      // Replace or add this valve entry
      const others = baseValves.filter(v => Number(v?.id) !== devValve)
      const meta = valves.find(v => v.id === id)
      const mergedValves = [
        ...others,
        { id: devValve, enabled: value, name: meta?.name, zone: meta?.zone },
      ]

      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valves: mergedValves, jobs: baseJobs }),
      })
    } catch (e) {
      console.error('toggleEnabled failed', e)
    }
  }

  const openValveDetails = (valve: Valve) => {
    setSelectedValve(valve)
    setSheetInitialTab('metrics')
    setIsSheetOpen(true)
  }

  const updateValve = (updatedValve: Valve) => {
    setValves(valves.map((v: Valve) => (v.id === updatedValve.id ? updatedValve : v)))
  }

  const displayValves = valves.filter((valve) => {
    const num = valve.id === 'v1' ? 1 : valve.id === 'v2' ? 2 : valve.id === 'v3' ? 3 : 0
    return enabledSet.has(num)
  })

  return (
    <>
      {/* Global listener to open sheet from other dashboard widgets (e.g., Config Summary) */}
      {(() => {
        if (typeof window !== 'undefined') {
          // attach once per mount
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useEffect(() => {
            const handler = (ev: any) => {
              try {
                const detail = ev?.detail || {}
                const idStr: string = typeof detail?.id === 'string' ? detail.id : (`v${Number(detail?.id)}`)
                const tab: 'metrics' | 'config' = detail?.tab === 'config' ? 'config' : 'metrics'
                const found = valves.find(v => v.id === idStr)
                if (found) {
                  setSelectedValve(found)
                  setSheetInitialTab(tab)
                  setIsSheetOpen(true)
                }
              } catch {}
            }
            window.addEventListener('open-valve-sheet', handler as any)
            return () => window.removeEventListener('open-valve-sheet', handler as any)
          }, [valves])
        }
        return null
      })()}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Control de Válvulas</h2>
            <p className="text-sm text-muted-foreground mt-1">Gestiona cada zona de riego individualmente</p>
          </div>
        </div>

        {displayValves.length === 0 ? (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border text-sm text-muted-foreground">
            No hay válvulas habilitadas. Habilítalas en Configuración.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {displayValves.map((valve) => {
            const num = valve.id === 'v1' ? 1 : valve.id === 'v2' ? 2 : valve.id === 'v3' ? 3 : 0
            const isEnabled = enabledSet.has(num)
            const v = { ...valve, enabled: isEnabled }
            return (
            <ValveCard
              key={v.id}
              valve={v}
              onToggle={() => toggleEnabled(v.id, !(v.enabled !== false))}
              onClick={() => openValveDetails(v)}
              showToggle={false}
            />
            )
          })}
        </div>
        )}
      </div>

      {selectedValve && (
        <ValveDetailSheet
          valve={selectedValve}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onUpdate={updateValve}
          initialTab={sheetInitialTab}
          onSelectValveId={(id: string) => {
            const found = valves.find(v => v.id === id)
            if (found) setSelectedValve(found)
          }}
          enabledValveIds={displayValves.map(v => v.id)}
        />
      )}
    </>
  )
}
