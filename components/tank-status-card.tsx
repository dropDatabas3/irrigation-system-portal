"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Droplets } from 'lucide-react'
import { useIrrigationEvents } from '@/lib/useEvents'

export function TankStatusCard() {
  const { lastResult } = useIrrigationEvents()
  const [current, setCurrent] = useState(0)
  const [capacity, setCapacity] = useState(0)
  const [percent, setPercent] = useState(0)
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
    refresh()
  }, [])

  useEffect(() => {
    if (lastResult) setTimeout(refresh, 250)
  }, [lastResult])

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
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="w-5 h-5 text-cyan-500" />
          Estado del Depósito
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Disponible</p>
            <p className="text-2xl font-bold text-foreground">{loading ? '—' : `${Math.round(current)} L`}</p>
            <p className="text-xs text-muted-foreground">{loading ? '' : `${percent}% ${capacity ? `· Capacidad ${Math.round(capacity)} L` : ''}`}</p>
          </div>
          <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-secondary/40 relative">
            <div className="absolute bottom-0 left-0 right-0 bg-cyan-500/80" style={{ height: `${percent}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Volumen cargado (L)</Label>
            <Input value={volumeInput} onChange={(e) => setVolumeInput(e.target.value)} placeholder="ej: 200" />
          </div>
          <div className="space-y-2">
            <Label>Capacidad (L) (opcional)</Label>
            <Input value={capacityInput} onChange={(e) => setCapacityInput(e.target.value)} placeholder={capacity ? String(capacity) : 'ej: 200'} />
          </div>
        </div>
        <Button type="button" onClick={handleLoad} disabled={saving} className="w-full bg-transparent" variant="outline">
          {saving ? 'Guardando…' : 'Cargar Depósito'}
        </Button>
      </CardContent>
    </Card>
  )
}
