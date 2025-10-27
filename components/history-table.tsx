"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Droplets, Settings } from "lucide-react"

type EventItem = {
  _id?: string
  type: "result" | "config-ack" | string
  ts: number
  payload?: any
}

type Row = {
  id: string
  timestamp: string
  valve: string
  action: string
  duration?: string
  waterUsed?: string
  actor?: string
  badgeVariant: "default" | "secondary" | "outline"
}

export function HistoryTable() {
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/history?limit=200', { cache: 'no-store' })
        const json = await res.json()
        if (!cancelled && json?.ok) {
          setItems(Array.isArray(json.items) ? json.items : [])
        }
      } catch {}
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const it of items) {
      const ts = Number(it?.ts)
      const when = Number.isFinite(ts) ? new Date(ts).toLocaleString() : '—'
      if (it?.type === 'result') {
        const v = Number(it?.payload?.valve)
        const liters = Number(it?.payload?.deliveredLiters ?? it?.payload?.liters ?? 0)
        const durMs = Number(it?.payload?.durationMs ?? 0)
        if (!Number.isFinite(v) || liters <= 0 || durMs <= 0) continue
        out.push({
          id: String(it?._id ?? `${ts}-v${v}`),
          timestamp: when,
          valve: v > 0 ? `Válvula ${v}` : '—',
          action: 'Riego',
          duration: `${Math.round(durMs / 60000)} min`,
          waterUsed: `${liters.toFixed(2)} L`,
          actor: 'Sistema',
          badgeVariant: 'default',
        })
      } else if (it?.type === 'config-ack') {
        const valvesArr: Array<any> = Array.isArray(it?.payload?.valves) ? it.payload.valves : []
        const enabled = valvesArr.filter(v => v?.enabled).length
        out.push({
          id: String(it?._id ?? `cfg-${ts}`),
          timestamp: when,
          valve: enabled ? `${enabled} habilitadas` : '—',
          action: 'Configuración aplicada',
          duration: '—',
          waterUsed: '—',
          actor: 'Sistema',
          badgeVariant: 'outline',
        })
      }
    }
    // latest first (already sorted desc in API, but ensure array type safety)
    return out.slice(0, 50)
  }, [items])

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Historial de Actividad</CardTitle>
        <CardDescription>Datos reales desde el dispositivo y la base de datos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-foreground">Fecha y Hora</TableHead>
                <TableHead className="text-foreground">Válvula / Detalle</TableHead>
                <TableHead className="text-foreground">Evento</TableHead>
                <TableHead className="text-foreground">Duración</TableHead>
                <TableHead className="text-foreground">Agua Usada</TableHead>
                <TableHead className="text-foreground">Origen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-secondary/30">
                  <TableCell className="font-medium text-foreground">{row.timestamp}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.action === 'Riego' ? (
                        <Droplets className="w-4 h-4 text-primary" />
                      ) : (
                        <Settings className="w-4 h-4 text-accent" />
                      )}
                      <span className="text-foreground">{row.valve}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.badgeVariant}>{row.action}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.duration ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.waterUsed ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.actor ?? '—'}</TableCell>
                </TableRow>
              ))}
              {(!loading && rows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    No hay eventos aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
