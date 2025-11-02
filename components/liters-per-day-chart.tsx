"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { useMetricsFilter } from '@/lib/metrics-filter-context'

const VALVE_COLORS = [
  { stroke: 'hsl(222 47% 55%)', fillId: 'fillV1', stopColor: 'hsl(222 47% 55%)' },
  { stroke: 'hsl(142 76% 45%)', fillId: 'fillV2', stopColor: 'hsl(142 76% 45%)' },
  { stroke: 'hsl(38 92% 50%)', fillId: 'fillV3', stopColor: 'hsl(38 92% 50%)' },
  { stroke: 'hsl(280 65% 60%)', fillId: 'fillV4', stopColor: 'hsl(280 65% 60%)' },
  { stroke: 'hsl(348 83% 47%)', fillId: 'fillV5', stopColor: 'hsl(348 83% 47%)' },
]

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
        let start: string, end: string
        if (timeRange !== 'custom') {
          const days = Number(timeRange)
          const e = new Date()
          const s = new Date(Date.now() - days * 24 * 3600 * 1000)
          start = s.toISOString()
          end = e.toISOString()
        } else {
          if (!customStart || !customEnd) {
            if (!cancelled) setLoading(false)
            return
          }
          start = customStart
          end = customEnd
        }

        const url = new URL('/api/metrics/liters-per-day', window.location.origin)
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
        results.forEach(({ valve, series }) => {
          series.forEach((item: any) => {
            const day = item.day
            if (!merged.has(day)) {
              merged.set(day, { day })
            }
            merged.get(day)![`v${valve}`] = item.liters || 0
          })
        })
        
        const chartData = Array.from(merged.values()).sort((a, b) => 
          new Date(a.day).getTime() - new Date(b.day).getTime()
        )
        
        if (!cancelled) {
          setData(chartData)
        }
      } catch {}
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [selectedValves, timeRange, customStart, customEnd])

  return (
    <Card className="gradient-border">
      <CardHeader className="p-4 sm:p-5 md:p-6">
        <CardTitle className="text-lg sm:text-xl text-foreground">Litros por día</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Evolución del consumo de agua</p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5 md:p-6 pt-0">
        <div className="w-full h-72 sm:h-80 md:h-96 lg:h-[420px]">
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
      </CardContent>
    </Card>
  )
}
