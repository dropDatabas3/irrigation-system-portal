"use client"

import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { useMetricsFilter } from '@/lib/metrics-filter-context'

const VALVE_COLORS = [
  { stroke: 'hsl(222 47% 55%)', fillId: 'fillV1', stopColor: 'hsl(222 47% 55%)' },
  { stroke: 'hsl(142 76% 45%)', fillId: 'fillV2', stopColor: 'hsl(142 76% 45%)' },
  { stroke: 'hsl(38 92% 50%)', fillId: 'fillV3', stopColor: 'hsl(38 92% 50%)' },
  { stroke: 'hsl(280 65% 60%)', fillId: 'fillV4', stopColor: 'hsl(280 65% 60%)' },
  { stroke: 'hsl(348 83% 47%)', fillId: 'fillV5', stopColor: 'hsl(348 83% 47%)' },
]

async function fetchChartData(
  selectedValves: number[],
  timeRange: string,
  customStart: string,
  customEnd: string
) {
  let start: string, end: string
  if (timeRange === 'custom') {
    if (!customStart || !customEnd) return []
    start = customStart
    end = customEnd
  } else {
    const days = Number(timeRange)
    const e = new Date()
    const s = new Date(Date.now() - days * 24 * 3600 * 1000)
    start = s.toISOString()
    end = e.toISOString()
  }

  const url = new URL('/api/metrics/liters-per-day', globalThis.location.origin)
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)
  
  const promises = selectedValves.map(async (valve) => {
    const valveUrl = new URL(url.toString())
    valveUrl.searchParams.set('valve', String(valve))
    const res = await fetch(valveUrl.toString(), { cache: 'no-store' })
    const json = await res.json()
    return { valve, series: json?.ok ? json.series || [] : [] }
  })
  
  const results = await Promise.all(promises)
  
  const merged = new Map<string, any>()
  for (const { valve, series } of results) {
    for (const item of series) {
      const day = item.day
      if (!merged.has(day)) {
        merged.set(day, { day })
      }
      merged.get(day)![`v${valve}`] = item.liters || 0
    }
  }
  
  return Array.from(merged.values()).sort((a, b) => 
    a.day.localeCompare(b.day)
  )
}

export function LitersPerDayChart() {
  const { selectedValves, timeRange, customStart, customEnd } = useMetricsFilter()
  const [data, setData] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (selectedValves.length === 0) {
      setData([])
      return
    }
    
    setLoading(true)
    ;(async () => {
      try {
        const chartData = await fetchChartData(selectedValves, timeRange, customStart, customEnd)
        
        if (!cancelled) {
          setData(chartData)
        }
      } catch {}
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [selectedValves, timeRange, customStart, customEnd])

  return (
    <GlassCard className="flex flex-col h-full">
      <div className="p-6 pb-2">
        <h3 className="text-lg font-medium text-foreground">Litros por día</h3>
        <p className="text-sm text-muted-foreground">Evolución del consumo de agua</p>
      </div>
      <div className="p-6 pt-0 flex-1">
        <div className="w-full h-[300px] sm:h-[350px] md:h-[400px]">
          {loading && (
            <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
              Cargando datos...
            </div>
          )}
          {!loading && data.length === 0 && (
            <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
              No hay datos disponibles para el rango seleccionado
            </div>
          )}
          {!loading && data.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {VALVE_COLORS.map((color) => (
                    <linearGradient key={color.fillId} id={color.fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color.stopColor} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={color.stopColor} stopOpacity={0.05}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false} 
                  width={45}
                  tickMargin={8}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                  formatter={(value) => `Válvula ${value.replace('v', '')}`}
                />
                {selectedValves.map((valve, idx) => {
                  const colorIdx = idx % VALVE_COLORS.length
                  const color = VALVE_COLORS[colorIdx]
                  return (
                    <Area
                      key={valve}
                      type="monotone"
                      dataKey={`v${valve}`}
                      stroke={color.stroke}
                      fill={`url(#${color.fillId})`}
                      strokeWidth={2.5}
                      name={`v${valve}`}
                    />
                  )
                })}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
