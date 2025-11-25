"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { TrendingDown, TrendingUp, Droplets, Clock, Calendar, ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useMetricsFilter } from "@/lib/metrics-filter-context"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MetricsOverview() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ totalMonthLiters: number; avgDayLiters: number; totalActiveHours: number } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [valvesWithData, setValvesWithData] = useState<Array<{ id: number; eventCount: number }>>([])

  const {
    selectedValves,
    setSelectedValves,
    timeRange,
    setTimeRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    setAvailableValves
  } = useMetricsFilter()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/metrics/valves-with-data', { cache: 'no-store' })
        const json = await res.json()
        if (!mounted || !json?.ok) return
        const valves: Array<{ id: number; eventCount: number }> = json.valves || []
        setValvesWithData(valves)
        setAvailableValves(valves.map(v => v.id))
        if (selectedValves.length === 0 && valves.length > 0) {
          setSelectedValves(valves.map(v => v.id))
        }
      } catch {
        if (mounted) {
          setValvesWithData([])
          setAvailableValves([])
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const params = new URLSearchParams()
        if (selectedValves.length === 1) {
          params.set('valve', String(selectedValves[0]))
        }
        const res = await fetch(`/api/metrics?${params.toString()}`, { cache: 'no-store' })
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
  }, [selectedValves, timeRange, customStart, customEnd])

  const fmt = (n: number, unit: string) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`

  const toggleValve = (valveId: number) => {
    setSelectedValves((prev: number[]) =>
      prev.includes(valveId)
        ? prev.filter((id: number) => id !== valveId)
        : [...prev, valveId]
    )
  }

  const selectAll = () => {
    setSelectedValves(valvesWithData.map(v => v.id))
  }

  const clearAll = () => {
    setSelectedValves([])
  }

  const metrics = [
    {
      label: "Consumo Total (Mes)",
      value: data ? fmt(data.totalMonthLiters, 'L') : (loading ? '' : '0 L'),
      change: "",
      trend: "up" as const,
      icon: Droplets,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Consumo Promedio (Día)",
      value: data ? fmt(data.avgDayLiters, 'L') : (loading ? '' : '0 L'),
      change: "",
      trend: "down" as const,
      icon: Calendar,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Tiempo Total Activo",
      value: data ? fmt(data.totalActiveHours, 'hrs') : (loading ? '' : '0 hrs'),
      change: "",
      trend: "up" as const,
      icon: Clock,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ]

  const selectedText = 
    selectedValves.length === 0 
      ? 'Ninguna válvula' 
      : selectedValves.length === valvesWithData.length
        ? 'Todas las válvulas'
        : `${selectedValves.length} válvula${selectedValves.length > 1 ? 's' : ''}`

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">Filtros Globales</h3>
            <p className="text-xs text-muted-foreground">
              Estos filtros afectan todas las métricas y gráficos de esta página
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Válvulas (Multi-selección)</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-10 text-sm bg-white/5 border-white/10 hover:bg-white/10">
                    {selectedText}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-card/95 backdrop-blur-xl border-white/10" align="start">
                  <DropdownMenuLabel>Seleccionar Válvulas</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <div className="flex gap-2 p-2">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={selectAll}>
                      Todas
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={clearAll}>
                      Ninguna
                    </Button>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {valvesWithData.map((valve) => (
                    <DropdownMenuCheckboxItem
                      key={valve.id}
                      checked={selectedValves.includes(valve.id)}
                      onCheckedChange={() => toggleValve(valve.id)}
                      className="focus:bg-primary/20 focus:text-primary"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>Válvula {valve.id}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-2 bg-white/10">
                          {valve.eventCount}
                        </Badge>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rango de Tiempo</Label>
              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger className="h-10 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="custom">Rango personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {timeRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 bg-white/5 border-white/10" />
                </div>
              </>
            )}
          </div>
          {selectedValves.length > 0 && selectedValves.length < valvesWithData.length && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              <span className="text-xs text-muted-foreground">Seleccionadas:</span>
              {selectedValves.slice().sort((a, b) => a - b).map(id => (
                  <Badge key={id} variant="default" className="text-xs bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
                    V{id}
                  </Badge>
                ))}
            </div>
          )}
        </div>
      </GlassCard>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown
          const trendColor = metric.trend === "up" ? "text-emerald-400" : "text-amber-400"
          return (
            <GlassCard key={metric.label} className="p-5 md:p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{metric.value}</p>
                  {metric.change && (
                    <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                      <TrendIcon className="w-4 h-4" />
                      <span>{metric.change}</span>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
              </div>
              {lastUpdated && (
                <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-muted-foreground">
                  Actualizado: {new Date(lastUpdated).toLocaleTimeString()}
                </div>
              )}
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}