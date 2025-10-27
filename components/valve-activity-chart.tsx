"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useMemo, useState } from "react"

type HistItem = { ts?: number; payload?: any }

const chartConfig = {
  minutes: {
    label: "Minutos",
    color: "hsl(var(--accent))",
  },
}

function valveLabel(n: number) {
  return `V${n}`
}

export function ValveActivityChart() {
  const [items, setItems] = useState<HistItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/history?type=result&limit=1000', { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled && data?.ok) setItems(Array.isArray(data.items) ? data.items : [])
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  const chartData = useMemo(() => {
    const totals = new Map<number, number>()
    for (const it of items) {
      const v = Number(it?.payload?.valve)
      const durMs = Number(it?.payload?.durationMs)
      if (!Number.isFinite(v) || !Number.isFinite(durMs)) continue
      totals.set(v, (totals.get(v) || 0) + durMs)
    }
    const arr = Array.from(totals.entries()).map(([valve, durMs]) => ({ valve: valveLabel(valve), minutes: Math.round(durMs / 60000) }))
    arr.sort((a, b) => a.valve.localeCompare(b.valve))
    return arr
  }, [items])

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Actividad por Válvula</CardTitle>
        <CardDescription>Tiempo activo en los últimos eventos</CardDescription>
      </CardHeader>
      <CardContent>
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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="minutes" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
