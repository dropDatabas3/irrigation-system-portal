"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useMemo, useState } from "react"

type HistItem = { ts?: number; payload?: any }

const chartConfig = {
  usage: {
    label: "Consumo (L)",
    color: "hsl(var(--primary))",
  },
}

export function WaterUsageChart() {
  const [items, setItems] = useState<HistItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/history?type=result&limit=500', { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled && data?.ok) setItems(Array.isArray(data.items) ? data.items : [])
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  const chartData = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const it of items) {
      const ts = Number(it?.ts)
      if (!Number.isFinite(ts)) continue
      const d = new Date(ts)
      const key = d.toLocaleDateString()
      const liters = Number(it?.payload?.deliveredLiters ?? it?.payload?.liters ?? 0)
      byDay.set(key, (byDay.get(key) || 0) + (Number.isFinite(liters) ? liters : 0))
    }
    const arr = Array.from(byDay.entries()).map(([date, usage]) => ({ date, usage }))
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return arr.slice(-14)
  }, [items])

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Consumo de Agua</CardTitle>
        <CardDescription>Últimos 14 días</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillUsage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
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
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="usage" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#fillUsage)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
