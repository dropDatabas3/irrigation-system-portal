"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Droplets, Info, Calendar, Clock } from "lucide-react"
import { fetchConfigDedupe } from "@/lib/config-client"
import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"

// Shape of /api/config GET response (best-effort)
interface ConfigDoc {
  deviceId?: string
  updatedAt?: string
  config?: {
    valves?: Array<{ id: number; enabled?: boolean; name?: string }>
    jobs?: Array<{ at: number; valve: number; liters?: number }>
  }
}

function formatAt(at: number) {
  try {
    const d = new Date(at * 1000)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return "-"
  }
}

export function DashboardConfigSummary() {
  const [data, setData] = useState<ConfigDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const json = await fetchConfigDedupe()
        if (mounted) setData(json as any)
      } catch {
        if (mounted) setData(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const grouped = useMemo(() => {
    const jobs = data?.config?.jobs ?? []
    const byValve = new Map<number, { count: number; next?: number }>()
    for (const j of jobs) {
      const item = byValve.get(j.valve) ?? { count: 0, next: undefined }
      item.count += 1
      if (!item.next || j.at < item.next) item.next = j.at
      byValve.set(j.valve, item)
    }
    return Array.from(byValve.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([valve, info]) => ({ valve, ...info }))
  }, [data])

  const content = (() => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )
    }

    if (!data?.config) {
      return <p className="text-sm text-muted-foreground">Sin configuración disponible.</p>
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Array.isArray(data.config.valves) ? data.config.valves : []).map((v: any, index) => {
          const g = grouped.find(x => x.valve === v.id)
          const enabled = v.enabled !== false && v.id !== 4 // v4 reservada
          
          let title = "Deshabilitada";
          if (v.id === 4) title = "Deshabilitada por sistema (hardware)";
          else if (enabled) title = "Habilitada";
          
          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 group ${
                enabled 
                  ? 'bg-card/40 border-white/5 hover:bg-card/60 hover:border-primary/30 cursor-pointer' 
                  : 'bg-card/20 border-white/5 opacity-60 grayscale'
              }`}
              title={title}
              onClick={() => {
                if (!enabled) return
                const idStr = `v${Number(v.id)}`
                try {
                  globalThis.dispatchEvent(new CustomEvent('open-valve-sheet', { detail: { id: idStr, tab: 'config' } }))
                } catch {}
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1.5 rounded-lg ${enabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Droplets className="w-4 h-4" />
                  </div>
                  <p className="font-medium truncate text-sm">Válvula {v.id}</p>
                </div>
                <Badge variant={enabled ? 'default' : 'secondary'} className="text-[10px] h-5">
                  {enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Programados
                  </span>
                  <span className="font-mono font-medium text-foreground bg-white/5 px-1.5 py-0.5 rounded">
                    {g?.count ?? 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Próximo
                  </span>
                  <span className={`font-mono font-medium ${g?.next ? 'text-primary' : 'text-muted-foreground'}`}>
                    {g?.next ? formatAt(g.next) : '-'}
                  </span>
                </div>
              </div>

              {enabled && (
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              )}
            </motion.div>
          )
        })}
      </div>
    )
  })()

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          <Info className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Resumen de Configuración</h2>
      </div>

      {content}
    </GlassCard>
  )
}
