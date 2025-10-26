"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Droplets, Info } from "lucide-react"

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
    return d.toLocaleString()
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
        const res = await fetch("/api/config", { cache: "no-store" })
        if (!res.ok) throw new Error("config fetch failed")
        const json = await res.json()
        if (mounted) setData(json)
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

  return (
    <Card className="gradient-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Info className="w-4 h-4" /> Resumen de configuración
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !data?.config ? (
          <p className="text-sm text-muted-foreground">Sin configuración disponible.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Array.isArray(data.config.valves) ? data.config.valves : []).map((v: any) => {
              const g = grouped.find(x => x.valve === v.id)
              const enabled = v.enabled !== false && v.id !== 4 // v4 reservada
              const title = v.id === 4 ? "Deshabilitada por sistema (hardware)" : enabled ? "Habilitada" : "Deshabilitada"
              return (
                <div key={v.id} className={`rounded-lg border p-3 sm:p-4 bg-card/40 ${!enabled ? 'opacity-60' : ''}`} title={title}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Droplets className="w-4 h-4" />
                      <p className="font-medium truncate">Válvula {v.id}{v.name ? ` · ${v.name}` : ''}</p>
                    </div>
                    <Badge variant={enabled ? 'default' : 'secondary'}>
                      {enabled ? 'Habilitada' : 'Deshabilitada'}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
                    <p>Riegos programados: <span className="font-semibold text-foreground">{g?.count ?? 0}</span></p>
                    <p>Próximo: <span className="font-semibold text-foreground">{g?.next ? formatAt(g.next) : '-'}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-3 text-xs sm:text-sm text-muted-foreground">
          Ver más en la sección de Configuración detallada dentro de cada válvula.
        </div>
      </CardContent>
    </Card>
  )
}
