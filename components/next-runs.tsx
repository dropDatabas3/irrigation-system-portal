"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Droplets } from "lucide-react"
import { useIrrigationEvents } from "@/lib/useEvents"

function numValveToLabel(v: number) {
  if (v === 1) return "V1"
  if (v === 2) return "V2"
  if (v === 3) return "V3"
  return `V${v}`
}

function formatWhen(tsSec: number) {
  const d = new Date(tsSec * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Hoy ${time}`
  if (isTomorrow) return `Mañana ${time}`
  return `${d.toLocaleDateString()} ${time}`
}

export function NextRuns() {
  const { lastConfigAck } = useIrrigationEvents()

  const items = (() => {
    const arr: Array<{ at: number; valve: number; liters?: number }> = Array.isArray(lastConfigAck?.jobs)
      ? lastConfigAck.jobs
      : []
    const future = arr
      .map((j) => ({ at: Number(j?.at), valve: Number(j?.valve), liters: Number(j?.liters) }))
      .filter((j) => Number.isFinite(j.at) && j.at * 1000 > Date.now())
      .sort((a, b) => a.at - b.at)
      .slice(0, 10)
    return future
  })()

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Próximos Riegos</CardTitle>
        <CardDescription>Próximas 10 ejecuciones programadas</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay riegos próximos programados</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((j, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {numValveToLabel(j.valve)}
                  </Badge>
                  <div className="text-sm">
                    <div className="text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      {formatWhen(j.at)}
                    </div>
                    {Number.isFinite(j.liters) && j.liters! > 0 ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Droplets className="w-3 h-3" /> {j.liters} L
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
