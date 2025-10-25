"use client"

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from 'recharts'

export function FlowGauge({ value, max = 40 }: { value: number; max?: number }) {
  const v = Math.max(0, Math.min(max, Number(value || 0)))
  const pct = (v / max) * 100
  const data = [{ name: 'flow', value: pct }]
  const color = v <= max * 0.4 ? '#22c55e' : v <= max * 0.75 ? '#eab308' : '#ef4444'
  return (
    <div className="w-full h-28 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="100%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={14}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            tickCount={3}
            tickFormatter={(t: any) => {
              const num = typeof t === 'number' ? t : Number(t)
              const val = Math.round((num / 100) * max)
              return `${val}`
            }}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
          />
          <RadialBar
            dataKey="value"
            cornerRadius={8}
            fill={color}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <div className="text-xs text-muted-foreground">Caudal</div>
        <div className="text-sm font-semibold text-foreground">{v.toFixed(1)} L/h</div>
        <div className="text-[10px] text-muted-foreground">0 · {Math.round(max/2)} · {max}</div>
      </div>
    </div>
  )
}
