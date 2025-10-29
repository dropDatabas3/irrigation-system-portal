"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  // Filters
  const [eventType, setEventType] = useState<'all' | 'result' | 'config-ack'>('all')
  const [valveFilter, setValveFilter] = useState<number | 0>(0)
  const [originFilter, setOriginFilter] = useState<'all' | 'Sistema' | 'Usuario'>('all')
  const [fromTs, setFromTs] = useState<string>('') // datetime-local
  const [toTs, setToTs] = useState<string>('')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [q, setQ] = useState('')

  // Fetch paginated results with server-side filters
  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (eventType !== 'all') params.set('type', eventType)
    if (valveFilter) params.set('valve', String(valveFilter))
    if (originFilter !== 'all') params.set('origin', originFilter) // reserved for future use
    if (fromTs) params.set('from', fromTs)
    if (toTs) params.set('to', toTs)
    if (q.trim()) params.set('q', q.trim())
    fetch(`/api/history?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!json?.ok) throw new Error('Respuesta inválida')
        setItems(Array.isArray(json.items) ? json.items : [])
        setTotal(Number(json.total || 0))
      })
      .catch((e: any) => {
        if (e?.name === 'AbortError') return
        setError(e?.message || 'Error al cargar')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [page, pageSize, eventType, valveFilter, originFilter, fromTs, toTs, q])

  // Items now come pre-filtered from the server
  const filtered: EventItem[] = useMemo(() => items, [items])

  // Map to rows after filtering
  const mapped: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const it of filtered) {
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
    return out
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageRows = mapped // already paginated by server

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Historial de Actividad</CardTitle>
        <CardDescription>Datos reales desde el dispositivo y la base de datos</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Evento</label>
            <Select value={eventType} onValueChange={(v: any) => { setEventType(v); setPage(1) }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="result">Riego</SelectItem>
                <SelectItem value="config-ack">Configuración</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Válvula</label>
            <Select value={String(valveFilter)} onValueChange={(v: string) => { setValveFilter(Number(v)); setPage(1) }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todas</SelectItem>
                <SelectItem value="1">V1</SelectItem>
                <SelectItem value="2">V2</SelectItem>
                <SelectItem value="3">V3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Origen</label>
            <Select value={originFilter} onValueChange={(v: any) => { setOriginFilter(v); setPage(1) }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Sistema">Sistema</SelectItem>
                <SelectItem value="Usuario">Usuario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input type="datetime-local" value={fromTs} onChange={(e) => { setFromTs(e.target.value); setPage(1) }} className="h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input type="datetime-local" value={toTs} onChange={(e) => { setToTs(e.target.value); setPage(1) }} className="h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Buscar</label>
              <Input placeholder="Texto libre" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Por página</label>
              <Select value={String(pageSize)} onValueChange={(v: string) => { setPageSize(Number(v)); setPage(1) }}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" className="h-8 bg-transparent" onClick={() => { setEventType('all'); setValveFilter(0); setOriginFilter('all'); setFromTs(''); setToTs(''); setQ(''); setPage(1) }}>Limpiar</Button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 mb-3">Error: {error}</div>
        )}
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
              {pageRows.map((row) => (
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
              {(!loading && mapped.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    No hay eventos aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-muted-foreground">Página {page} de {totalPages} • {total} eventos</div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-8 bg-transparent" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
            <Button type="button" variant="outline" className="h-8 bg-transparent" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
