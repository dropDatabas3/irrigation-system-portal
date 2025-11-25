"use client"

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Droplets, Save, RefreshCw } from 'lucide-react'
import { useIrrigationEvents } from '@/lib/useEvents'
import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"

type TankInitial = { currentLiters: number; capacityLiters: number; percent: number }

const BUBBLES = Array.from({ length: 5 }, (_, i) => i);

export function TankStatusCard({ initial, disableInitialFetch = false }: Readonly<{ initial?: TankInitial | null; disableInitialFetch?: boolean }>) {
  const { lastResult } = useIrrigationEvents()
  const [current, setCurrent] = useState(() => Math.max(0, Number(initial?.currentLiters) || 0))
  const [capacity, setCapacity] = useState(() => Math.max(0, Number(initial?.capacityLiters) || 0))
  const [percent, setPercent] = useState(() => Math.max(0, Math.min(100, Number(initial?.percent) || 0)))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [volumeInput, setVolumeInput] = useState('')
  const [capacityInput, setCapacityInput] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tank', { cache: 'no-store' })
      const j = await res.json()
      if (j?.ok) {
        setCurrent(Math.max(0, Number(j.currentLiters) || 0))
        setCapacity(Math.max(0, Number(j.capacityLiters) || 0))
        setPercent(Math.max(0, Math.min(100, Number(j.percent) || 0)))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (disableInitialFetch && initial) {
      setLoading(false)
    } else {
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!disableInitialFetch && lastResult) setTimeout(refresh, 250)
    // If disableInitialFetch, let parent refresh values when needed
  }, [lastResult, disableInitialFetch])

  const handleLoad = async () => {
    setSaving(true)
    try {
      const body: any = {}
      const v = Number(volumeInput)
      const c = Number(capacityInput)
      if (Number.isFinite(v)) body.setVolumeLiters = v
      if (Number.isFinite(c)) body.setCapacityLiters = c
      const res = await fetch('/api/tank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (j?.ok) {
        setVolumeInput('')
        setCapacityInput('')
        setCurrent(Math.max(0, Number(j.currentLiters) || 0))
        setCapacity(Math.max(0, Number(j.capacityLiters) || 0))
        setPercent(Math.max(0, Math.min(100, Number(j.percent) || 0)))
      }
    } catch {}
    setSaving(false)
  }

  return (
    <GlassCard className="relative overflow-hidden p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
            <Droplets className="w-5 h-5" />
          </div>
          Estado del Depósito
        </h3>
        {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Visual Tank */}
        <div className="relative h-48 w-full max-w-[200px] mx-auto rounded-2xl border-2 border-white/10 bg-black/20 backdrop-blur-sm overflow-hidden">
          {/* Glass reflections */}
          <div className="absolute inset-0 z-20 bg-linear-to-r from-white/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 z-20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none" />
          
          {/* Liquid */}
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out z-10" style={{ height: `${percent}%` }}>
            <div className="absolute inset-0 bg-cyan-500/60 backdrop-blur-md animate-pulse-glow" />
            <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-400/50 blur-sm" />
            
            {/* Bubbles effect */}
            <div className="absolute inset-0 overflow-hidden">
              {BUBBLES.map((i) => (
                <motion.div
                  key={i}
                  className="absolute bottom-0 w-2 h-2 rounded-full bg-white/30"
                  style={{ left: `${(i * 20) + 10}%` }}
                  animate={{ y: -200, opacity: 0 }}
                  transition={{ 
                    duration: 2 + (i % 3), 
                    repeat: Infinity, 
                    delay: i * 0.5,
                    ease: "linear"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Percentage Text Overlay */}
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div className="text-center">
              <span className="text-3xl font-bold text-white drop-shadow-lg">{Math.round(percent)}%</span>
              <p className="text-xs text-white/80 font-medium drop-shadow-md">Lleno</p>
            </div>
          </div>
        </div>

        {/* Stats & Controls */}
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Volumen Actual</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground tracking-tight">{loading ? '—' : Math.round(current)}</span>
              <span className="text-lg text-muted-foreground">Litros</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Capacidad total: {Math.round(capacity)} L
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Cargar Volumen (L)</Label>
                <Input 
                  value={volumeInput} 
                  onChange={(e) => setVolumeInput(e.target.value)} 
                  placeholder="ej: 200"
                  className="bg-white/5 border-white/10 focus:border-cyan-500/50" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Capacidad (L)</Label>
                <Input 
                  value={capacityInput} 
                  onChange={(e) => setCapacityInput(e.target.value)} 
                  placeholder={capacity ? String(capacity) : 'ej: 1000'}
                  className="bg-white/5 border-white/10 focus:border-cyan-500/50" 
                />
              </div>
            </div>
            <Button 
              onClick={handleLoad} 
              disabled={saving} 
              className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-500 border border-cyan-500/50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Actualizando...' : 'Actualizar Depósito'}
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
