"use client"

import { Activity, Database, Clock, Wifi } from "lucide-react"
import { useIrrigationEvents } from "@/lib/useEvents"
import { useEffect, useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"

export function SystemStatus() {
  const { online, lastStatus, lastStatusTs } = useIrrigationEvents()
  const [dbStatus, setDbStatus] = useState<'checking'|'connected'|'disconnected'>('checking')
  const [dbName, setDbName] = useState<string|undefined>(undefined)

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
    return { text: `${sign}${mm}:${ss.toString().padStart(2,'0')}`, warn: abs > 120 }
  })()

  const rssiInfo = (() => {
    const rssi = (lastStatus as any)?.rssi
    if (typeof rssi !== 'number') return null
    return { val: rssi }
  })()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Main Connectivity Card */}
      <GlassCard className="md:col-span-2 p-5 flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <h3 className="text-sm font-medium text-muted-foreground">Estado del Sistema</h3>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${online ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}
            >
              <div className={`w-2 h-2 rounded-full ${online ? 'bg-primary animate-pulse-glow' : 'bg-destructive'}`} />
              <span className="text-sm font-semibold">{online ? 'Sistema Online' : 'Desconectado'}</span>
            </motion.div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/5 text-muted-foreground">
              <Database className="w-3 h-3" />
              <span className="text-xs">{dbStatus === 'connected' ? `DB: ${dbName}` : 'DB Offline'}</span>
            </div>
          </div>

          {lastSeen && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Última sincronización: <span className="text-foreground font-medium">{lastSeen}</span>
            </p>
          )}
        </div>

        {/* Background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-linear-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500" />
      </GlassCard>

      {/* Telemetry Card */}
      <GlassCard className="p-5 flex flex-col justify-center gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wifi className="w-4 h-4" />
            <span className="text-xs font-medium">Señal WiFi</span>
          </div>
          <span className={`text-xs font-bold ${rssiInfo?.val && rssiInfo.val > -70 ? 'text-primary' : 'text-yellow-500'}`}>
            {rssiInfo ? `${rssiInfo.val} dBm` : '--'}
          </span>
        </div>
        
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: rssiInfo ? `${Math.min(100, Math.max(0, (rssiInfo.val + 100) * 2))}%` : '0%' }}
            className="h-full bg-primary"
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Sincronización</span>
          </div>
          <span className={`text-xs font-mono ${timeSkewInfo?.warn ? 'text-destructive' : 'text-foreground'}`}>
            {timeSkewInfo ? timeSkewInfo.text : '--:--'}
          </span>
        </div>
      </GlassCard>
    </div>
  )
}
