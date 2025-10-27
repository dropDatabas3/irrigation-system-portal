"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingDown, TrendingUp, Droplets, Clock, Calendar } from "lucide-react"
import { useEffect, useState } from "react"

export function MetricsOverview() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ totalMonthLiters: number; avgDayLiters: number; totalActiveHours: number } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/metrics', { cache: 'no-store' })
        const json = await res.json()
        if (!cancelled && json?.ok) {
          setData({
            totalMonthLiters: Number(json.totalMonthLiters || 0),
            avgDayLiters: Number(json.avgDayLiters || 0),
            totalActiveHours: Number(json.totalActiveHours || 0),
          })
          setLastUpdated(Date.now())
        }
      } catch {}
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const fmt = (n: number, unit: string) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`

  const metrics = [
    {
      label: "Consumo Total (Mes)",
      value: data ? fmt(data.totalMonthLiters, 'L') : (loading ? '—' : '0 L'),
      change: "",
      trend: "up" as const,
      icon: Droplets,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Consumo Promedio (Día)",
      value: data ? fmt(data.avgDayLiters, 'L') : (loading ? '—' : '0 L'),
      change: "",
      trend: "down" as const,
      icon: Calendar,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Tiempo Total Activo",
      value: data ? fmt(data.totalActiveHours, 'hrs') : (loading ? '—' : '0 hrs'),
      change: "",
      trend: "up" as const,
      icon: Clock,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
  const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown
  const trendColor = metric.trend === "up" ? "text-chart-4" : "text-accent"

        return (
          <Card key={index} className="gradient-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  {metric.change && (
                    <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                      <TrendIcon className="w-4 h-4" />
                      <span>{metric.change}</span>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
              </div>
              {lastUpdated && (
                <div className="mt-2 text-[10px] text-muted-foreground">Actualizado: {new Date(lastUpdated).toLocaleTimeString()}</div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
