"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useMemo, useState } from "react"
import { Droplets } from "lucide-react"
import { useMetricsFilter } from "@/lib/metrics-filter-context"

type HistItem = { ts?: number; payload?: any }

const VALVE_COLORS = [
  { dataKey: 'v1', color: 'hsl(222 47% 55%)', fillId: 'fillV1' },
  { dataKey: 'v2', color: 'hsl(142 76% 45%)', fillId: 'fillV2' },
  { dataKey: 'v3', color: 'hsl(38 92% 50%)', fillId: 'fillV3' },
  { dataKey: 'v4', color: 'hsl(280 65% 60%)', fillId: 'fillV4' },
  { dataKey: 'v5', color: 'hsl(348 83% 47%)', fillId: 'fillV5' },
]

const chartConfig = {
  usage: {
    label: "Consumo (L)",
    color: "hsl(var(--primary))",
  },
}

export function WaterUsageChart() {
  const { selectedValves, timeRange, customStart, customEnd } = useMetricsFilter()
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
    // Calculate time range filter
    let startDate: Date | null = null
    if (timeRange === 'custom' && customStart) {
      startDate = new Date(customStart)
    } else if (timeRange !== 'custom') {
      const days = Number(timeRange) || 30
      startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
    }

    // Filter items by selected valves and time range
    const filteredItems = items.filter(it => {
      const valve = Number(it?.payload?.valve)
      if (!Number.isFinite(valve) || !selectedValves.includes(valve)) return false
      
      // Apply time filter
      if (startDate) {
        const ts = Number(it?.ts)
        if (!Number.isFinite(ts)) return false
        if (ts < startDate.getTime()) return false
      }
      
      return true
    })

    // Group by day and valve
    const byDay = new Map<string, any>()
    for (const it of filteredItems) {
      const ts = Number(it?.ts)
      if (!Number.isFinite(ts)) continue
      const valve = Number(it?.payload?.valve)
      const liters = Number(it?.payload?.deliveredLiters ?? it?.payload?.liters ?? 0)
      const durMs = Number(it?.payload?.durationMs ?? 0)
      if (liters <= 0) continue
      
      const d = new Date(ts)
      const key = d.toLocaleDateString()
      if (!byDay.has(key)) {
        byDay.set(key, { date: key })
      }
      const day = byDay.get(key)!
      day[`v${valve}`] = (day[`v${valve}`] || 0) + liters
    }
    
    const arr = Array.from(byDay.values())
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return arr
  }, [items, selectedValves, timeRange, customStart])

  const timeRangeDescription = useMemo(() => {
    if (timeRange === 'custom') {
      if (customStart && customEnd) {
        return `Del ${new Date(customStart).toLocaleDateString()} al ${new Date(customEnd).toLocaleDateString()}`
      }
      return 'Período personalizado'
    }
    const days = Number(timeRange)
    return `Últimos ${days} días`
  }, [timeRange, customStart, customEnd])

  return (
    <GlassCard className="flex flex-col h-full">
      <div className="p-6 pb-2">
        <h3 className="text-lg font-medium text-foreground">Consumo de Agua</h3>
        <p className="text-sm text-muted-foreground">{timeRangeDescription}</p>
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
            Cargando datos del consumo...
          </div>
        )}
        {!error && !loading && chartData.length === 0 && (
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Droplets className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No hay datos de consumo disponibles</p>
            </div>
          </div>
        )}
        {!error && !loading && chartData.length > 0 && (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {VALVE_COLORS.map((vc) => (
                    <linearGradient key={vc.fillId} id={vc.fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={vc.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={vc.color} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
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
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                  formatter={(value) => `Válvula ${value.replace('v', '')}`}
                />
                {selectedValves.map((valve, idx) => {
                  const colorIdx = idx % VALVE_COLORS.length
                  const vc = VALVE_COLORS[colorIdx]
                  return (
                    <Area
                      key={valve}
                      type="monotone"
                      dataKey={`v${valve}`}
                      stroke={vc.color}
                      fill={`url(#${vc.fillId})`}
                      strokeWidth={2.5}
                      name={`v${valve}`}
                    />
                  )
                })}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </GlassCard>
  )
}
