"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingDown, TrendingUp, Droplets, Clock, Calendar, Zap } from "lucide-react"

export function MetricsOverview() {
  const metrics = [
    {
      label: "Consumo Total (Mes)",
      value: "4,250 L",
      change: "+12%",
      trend: "up" as const,
      icon: Droplets,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Consumo Promedio (Día)",
      value: "142 L",
      change: "-5%",
      trend: "down" as const,
      icon: Calendar,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Tiempo Total Activo",
      value: "28.5 hrs",
      change: "+8%",
      trend: "up" as const,
      icon: Clock,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      label: "Eficiencia del Sistema",
      value: "94%",
      change: "+3%",
      trend: "up" as const,
      icon: Zap,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
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
                  <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span>{metric.change}</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
