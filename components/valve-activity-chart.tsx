"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useMemo, useState } from "react"
import { Clock } from "lucide-react"
import { useMetricsFilter } from "@/lib/metrics-filter-context"

type HistItem = { ts?: number; payload?: any }

const chartConfig = {
  minutes: {
    label: "Minutos",
    color: "hsl(var(--primary))",
  },
}

function valveLabel(n: number) {
  return `V${n}`
}

export function ValveActivityChart() {
  const { selectedValves } = useMetricsFilter()
  const [items, setItems] = useState<HistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch('/api/history?type=result&limit=1000', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled && data?.ok) setItems(Array.isArray(data.items) ? data.items : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Error al cargar')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const chartData = useMemo(() => {
    const totals = new Map<number, number>()
    for (const it of items) {
      const v = Number(it?.payload?.valve)
      const durMs = Number(it?.payload?.durationMs)
      if (!Number.isFinite(v) || !Number.isFinite(durMs)) continue
      if (durMs <= 0) continue
      if (!selectedValves.includes(v)) continue
      totals.set(v, (totals.get(v) || 0) + durMs)
    }
    const arr = Array.from(totals.entries()).map(([valve, durMs]) => ({ 
      valve: valveLabel(valve), 
      valveNum: valve,
      minutes: Math.max(1, Math.round(durMs / 60000)) 
    }))
    arr.sort((a, b) => a.valveNum - b.valveNum)
    return arr
  }, [items, selectedValves])

  return (
    <GlassCard className="flex flex-col h-full">
      <div className="p-6 pb-2">
        <h3 className="text-lg font-medium text-foreground">Actividad por Válvula</h3>
        <p className="text-sm text-muted-foreground">Tiempo activo total por válvula</p>
      </div>
      <div className="p-6 pt-0 flex-1">
        {error && (
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-sm text-red-400">Error al cargar datos</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        {!error && loading && (
          <div className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground">
            Cargando actividad de válvulas...
          </div>
        )}
        {!error && !loading && chartData.length === 0 && (
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No hay datos de actividad disponibles</p>
            </div>
          </div>
        )}
        {!error && !loading && chartData.length > 0 && (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="valve"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={45}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <ChartTooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  content={<ChartTooltipContent />} 
                />
                <Bar 
                  dataKey="minutes" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </GlassCard>
  )
}
