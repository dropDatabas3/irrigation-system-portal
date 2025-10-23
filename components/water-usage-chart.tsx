"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { date: "01/12", usage: 120 },
  { date: "02/12", usage: 135 },
  { date: "03/12", usage: 145 },
  { date: "04/12", usage: 128 },
  { date: "05/12", usage: 142 },
  { date: "06/12", usage: 155 },
  { date: "07/12", usage: 138 },
  { date: "08/12", usage: 148 },
  { date: "09/12", usage: 152 },
  { date: "10/12", usage: 145 },
  { date: "11/12", usage: 158 },
  { date: "12/12", usage: 162 },
  { date: "13/12", usage: 149 },
  { date: "14/12", usage: 155 },
]

const chartConfig = {
  usage: {
    label: "Consumo (L)",
    color: "hsl(var(--primary))",
  },
}

export function WaterUsageChart() {
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
