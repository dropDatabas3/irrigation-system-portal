"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, Database, Droplets, Power, SignalHigh, Thermometer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useIrrigationEvents } from "@/lib/useEvents"
import { useEffect, useMemo, useState } from "react"
import { fetchConfigDedupe } from "@/lib/config-client"

export function SystemStatus() {
  const { online, lastStatus, lastStatusTs, activeValvesCount, lastConfigAck } = useIrrigationEvents()
  const [dbStatus, setDbStatus] = useState<'checking'|'connected'|'disconnected'>('checking')
  const [dbName, setDbName] = useState<string|undefined>(undefined)
  const [enabledValves, setEnabledValves] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/db-health', { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled) {
          if (data?.ok && data?.connected) {
            setDbStatus('connected')
            setDbName(data?.db)
          } else {
            setDbStatus('disconnected')
            setDbName(undefined)
          }
        }
      } catch {
        if (!cancelled) setDbStatus('disconnected')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Compute enabled valves from last config ack, fallback to fetching /api/config once
  useEffect(() => {
    const fromAck = Array.isArray((lastConfigAck as any)?.valves)
      ? ((lastConfigAck as any).valves as Array<{ id: number; enabled?: boolean }>)
      : null
    if (fromAck) {
      const count = fromAck.filter(v => v && v.id && v.enabled).length
      setEnabledValves(count)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const json = await fetchConfigDedupe()
        const arr: Array<{ id: number; enabled?: boolean }> = Array.isArray(json?.config?.valves)
          ? json.config.valves
          : []
        if (!cancelled) setEnabledValves(arr.filter(v => v.enabled).length)
      } catch {
        if (!cancelled) setEnabledValves(null)
      }
    })()
    return () => { cancelled = true }
  }, [lastConfigAck])
  const deviceTime = (() => {
    const t = (lastStatus as any)?.time
    if (!t) return null
    // Firmware sends epoch seconds; format to local date/time
    const ms = t > 1e12 ? t : t * 1000
    try {
      return new Date(ms).toLocaleString()
    } catch {
      return String(t)
    }
  })()

  const lastSeen = (() => {
    if (!lastStatusTs) return null
    const delta = Math.max(0, Date.now() - lastStatusTs)
    const s = Math.floor(delta / 1000)
    if (s < 60) return `hace ${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `hace ${m}m`
    const h = Math.floor(m / 60)
    return `hace ${h}h`
  })()

  const timeSkewInfo = (() => {
    const t = (lastStatus as any)?.time
    if (!t) return null
    const devMs = (t > 1e12 ? t : t * 1000) as number
    const deltaSec = Math.round((devMs - Date.now()) / 1000)
    const abs = Math.abs(deltaSec)
    const sign = deltaSec >= 0 ? '+' : '-'
    const mm = Math.floor(abs / 60)
    const ss = abs % 60
    return { text: `${sign}${mm}:${ss.toString().padStart(2,'0')} (desfase)`, warn: abs > 120 }
  })()

  const rssiInfo = (() => {
    const rssi = (lastStatus as any)?.rssi
    if (typeof rssi !== 'number') return null
    let quality = 'desconocida'
    if (rssi >= -67) quality = 'excelente'
    else if (rssi >= -70) quality = 'buena'
    else if (rssi >= -80) quality = 'regular'
    else quality = 'débil'
    return `${rssi} dBm (${quality})`
  })()
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Conectividad */}
      <Card className="gradient-border">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Conectividad</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {online === null ? (
                  <Badge variant="outline" title="Estado MQTT">
                    <Power className="w-3 h-3 mr-1" /> Conectando…
                  </Badge>
                ) : online ? (
                  <Badge variant="default" className="gradient-primary" title="Estado MQTT">
                    <Power className="w-3 h-3 mr-1" /> Online
                  </Badge>
                ) : (
                  <Badge variant="destructive" title="Estado MQTT">
                    <Power className="w-3 h-3 mr-1" /> Offline
                  </Badge>
                )}
                {dbStatus === 'checking' ? (
                  <Badge variant="outline" title="Estado de base de datos">
                    <Database className="w-3 h-3 mr-1" /> DB…
                  </Badge>
                ) : dbStatus === 'connected' ? (
                  <Badge variant="default" title="Estado de base de datos">
                    <Database className="w-3 h-3 mr-1" /> DB: {dbName || 'ok'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" title="Estado de base de datos">
                    <Database className="w-3 h-3 mr-1" /> DB: caída
                  </Badge>
                )}
              </div>
              {lastSeen && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Última actualización: {lastSeen}</p>
              )}
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
