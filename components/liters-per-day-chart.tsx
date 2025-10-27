"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function fmtDate(d: string) { return d }

export function LitersPerDayChart() {
  const [range, setRange] = useState<'7'|'30'|'90'|'custom'>('30')
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const [valves, setValves] = useState<number[]>([1,2,3])
  const [selectedValve, setSelectedValve] = useState<number | null>(1)
  const [data, setData] = useState<Array<{ day: string; liters: number }>>([])
  const [loading, setLoading] = useState(false)

  const [queryStart, queryEnd] = useMemo(() => {
    if (range !== 'custom') {
      const days = Number(range)
      const e = new Date()
      const s = new Date(Date.now() - days * 24 * 3600 * 1000)
      return [s.toISOString(), e.toISOString()]
    }
    if (start && end) return [start, end]
    return [null, null]
  }, [range, start, end])

  // Load configured valves for selector (prefer API config)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' })
        const json = await res.json()
        const arr: Array<{ id: number; enabled?: boolean }>
          = Array.isArray(json?.config?.valves) ? json.config.valves : []
        let vs = arr.length ? arr.map(v => v.id).filter(n => Number.isFinite(n)) : [1,2,3]
        vs = Array.from(new Set(vs)).filter(n => n >= 1 && n <= 8).sort((a,b)=>a-b)
        if (mounted) {
          setValves(vs)
          setSelectedValve(vs[0] ?? 1)
        }
      } catch {
        if (mounted) {
          setValves([1,2,3])
          setSelectedValve(1)
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!queryStart || !queryEnd) return
    setLoading(true)
    ;(async () => {
      try {
        const url = new URL('/api/metrics/liters-per-day', window.location.origin)
        url.searchParams.set('start', queryStart)
        url.searchParams.set('end', queryEnd)
        if (selectedValve && Number.isFinite(selectedValve)) {
          url.searchParams.set('valve', String(selectedValve))
        }
        const res = await fetch(url.toString(), { cache: 'no-store' })
        const json = await res.json()
        if (!cancelled && json?.ok) {
          setData(json.series || [])
        }
      } catch {}
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [queryStart, queryEnd, selectedValve])

  return (
    <Card className="gradient-border">
      <CardHeader className="px-3 py-3 sm:p-4">
        <CardTitle className="text-base sm:text-lg">Litros por día</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="space-y-1">
            <Label>Rango</Label>
            <Select value={range} onValueChange={(v: any) => setRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Válvula</Label>
            <Select value={String(selectedValve ?? '')} onValueChange={(v: string) => setSelectedValve(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {valves.map(v => (
                  <SelectItem key={v} value={String(v)}>Válvula {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {range === 'custom' && (
            <>
              <div className="space-y-1">
                <Label>Desde</Label>
                <Input type="date" value={start} onChange={(e: any) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Hasta</Label>
                <Input type="date" value={end} onChange={(e: any) => setEnd(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="w-full h-56 sm:h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ background: 'rgba(20,20,28,0.95)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Area type="monotone" dataKey="liters" stroke="#06b6d4" fill="url(#fillL)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {loading && <p className="text-xs text-muted-foreground">Cargando…</p>}
      </CardContent>
    </Card>
  )
}
