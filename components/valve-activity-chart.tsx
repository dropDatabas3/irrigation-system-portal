"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { valve: "V1", minutes: 180 },
  { valve: "V2", minutes: 225 },
  { valve: "V3", minutes: 150 },
  { valve: "V4", minutes: 300 },
  { valve: "V5", minutes: 90 },
  { valve: "V6", minutes: 120 },
]

const chartConfig = {
  minutes: {
    label: "Minutos",
    color: "hsl(var(--accent))",
  },
}

export function ValveActivityChart() {
  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Actividad por Válvula</CardTitle>
        <CardDescription>Tiempo activo en los últimos 7 días</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
