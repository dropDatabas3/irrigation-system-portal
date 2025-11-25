"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
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
        // Prioritize deliveredLiters, fallback to liters
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
    <GlassCard className="flex flex-col h-full">
      <div className="p-6 pb-2">
        <h3 className="text-lg font-medium text-foreground">Historial de Actividad</h3>
        <p className="text-sm text-muted-foreground">Datos reales desde el dispositivo y la base de datos</p>
      </div>
      <div className="p-6 pt-0 flex-1">
        {/* Filters - Responsive Grid */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Evento</label>
              <Select value={eventType} onValueChange={(v: any) => { setEventType(v); setPage(1) }}>
                <SelectTrigger className="h-9 bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="result">Riego</SelectItem>
                  <SelectItem value="config-ack">Configuración</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Válvula</label>
              <Select value={String(valveFilter)} onValueChange={(v: string) => { setValveFilter(Number(v)); setPage(1) }}>
                <SelectTrigger className="h-9 bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todas</SelectItem>
                  <SelectItem value="1">V1</SelectItem>
                  <SelectItem value="2">V2</SelectItem>
                  <SelectItem value="3">V3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Origen</label>
              <Select value={originFilter} onValueChange={(v: any) => { setOriginFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9 bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Sistema">Sistema</SelectItem>
                  <SelectItem value="Usuario">Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Por página</label>
              <Select value={String(pageSize)} onValueChange={(v: string) => { setPageSize(Number(v)); setPage(1) }}>
                <SelectTrigger className="h-9 bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input 
                type="datetime-local" 
                value={fromTs} 
                onChange={(e) => { setFromTs(e.target.value); setPage(1) }} 
                className="h-9 bg-background/50 border-white/10" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input 
                type="datetime-local" 
                value={toTs} 
                onChange={(e) => { setToTs(e.target.value); setPage(1) }} 
                className="h-9 bg-background/50 border-white/10" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <Input 
                placeholder="Texto libre" 
                value={q} 
                onChange={(e) => { setQ(e.target.value); setPage(1) }} 
                className="h-9 bg-background/50 border-white/10" 
              />
            </div>

            <div className="space-y-1 flex items-end">
              <Button 
                type="button" 
                variant="outline" 
                className="h-9 w-full bg-background/50 border-white/10 hover:bg-white/10" 
                onClick={() => { 
                  setEventType('all'); 
                  setValveFilter(0); 
                  setOriginFilter('all'); 
                  setFromTs(''); 
                  setToTs(''); 
                  setQ(''); 
                  setPage(1) 
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            Error: {error}
          </div>
        )}

        {/* Responsive Table Wrapper */}
        <div className="rounded-lg border border-white/10 overflow-x-auto bg-background/30">
          <Table>
            <TableHeader>
              <TableRow className="bg-white/5 border-white/10 hover:bg-white/10">
                <TableHead className="text-foreground whitespace-nowrap">Fecha y Hora</TableHead>
                <TableHead className="text-foreground whitespace-nowrap">Válvula / Detalle</TableHead>
                <TableHead className="text-foreground whitespace-nowrap">Evento</TableHead>
                <TableHead className="text-foreground whitespace-nowrap">Duración</TableHead>
                <TableHead className="text-foreground whitespace-nowrap">Agua Usada</TableHead>
                <TableHead className="text-foreground whitespace-nowrap">Origen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-foreground whitespace-nowrap">{row.timestamp}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {row.action === 'Riego' ? (
                        <Droplets className="w-4 h-4 text-primary" />
                      ) : (
                        <Settings className="w-4 h-4 text-accent" />
                      )}
                      <span className="text-foreground">{row.valve}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={row.badgeVariant}>{row.action}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{row.duration ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{row.waterUsed ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{row.actor ?? '—'}</TableCell>
                </TableRow>
              ))}
              {(!loading && mapped.length === 0) && (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No hay eventos que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Cargando eventos...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Página {page} de {totalPages} • {total} evento{total !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-9 bg-background/50 border-white/10 hover:bg-white/10" 
              disabled={page <= 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-9 bg-background/50 border-white/10 hover:bg-white/10" 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
