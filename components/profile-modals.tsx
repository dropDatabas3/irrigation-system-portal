"use client"

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Profile = { name: string; schedule: any }

export function LoadProfileModal({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (v: boolean) => void; onApply: (name: string) => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/profiles', { cache: 'no-store' })
        const j = await res.json()
        if (!cancelled && Array.isArray(j?.profiles)) setProfiles(j.profiles)
      } catch {}
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-5">
        <SheetHeader>
          <SheetTitle>Cargar perfil de riego</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select disabled={loading || profiles.length === 0} onValueChange={(v: string) => setSelected(v)}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? 'Cargando…' : (profiles.length ? 'Elegir perfil' : 'Sin perfiles')} />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-auto">
                {profiles.map(p => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="bg-transparent flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" className="flex-1" disabled={!selected} onClick={() => { if (selected) { onApply(selected); onOpenChange(false) } }}>Cargar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function SaveProfileModal({ open, onOpenChange, schedule, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; schedule: any | undefined; onSaved?: (name: string) => void }) {
  const [name, setName] = useState('')
  useEffect(() => { if (open) setName('') }, [open])

  const handleSave = async () => {
    if (!schedule) return
    const n = name.trim()
    if (!n) return
    const res = await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n, schedule }) })
    const j = await res.json()
    if (res.ok && j?.ok) {
      onSaved?.(n)
      onOpenChange(false)
    }
  }

  const Summary = () => {
    if (!schedule) return <p className="text-sm text-muted-foreground">No hay una rutina configurada.</p>
    return (
      <div className="text-sm text-muted-foreground space-y-1">
        <div>Modo: <span className="text-foreground font-medium">{schedule.mode}</span></div>
        {schedule.mode === 'daily' && (
          <div>Horas: {(schedule.times || ['08:00']).join(', ')}</div>
        )}
        {schedule.mode === 'weekly' && (
          <div>Días: {(schedule.days || []).join(', ')} · Hora: {schedule.startTime || '08:00'}</div>
        )}
        {schedule.mode === 'interval' && (
          <div>Intervalo: {schedule.intervalDays || 0}d {schedule.intervalHours || 0}h · Inicio: {schedule.startTime || '08:00'} {schedule.consecutiveWaterings > 1 ? `· ${schedule.consecutiveWaterings} riegos c/${schedule.wateringIntervalMinutes}m` : ''}</div>
        )}
        {schedule.mode === 'custom' && (
          <div>Días: {(schedule.days || []).join(', ')} · Horas: {(schedule.times || ['08:00']).join(', ')}</div>
        )}
        <div>Litros por riego: {Number(schedule.liters || 0)} L</div>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-5">
        <SheetHeader>
          <SheetTitle>Guardar perfil de riego</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Summary />
          <div className="space-y-2">
            <Label>Nombre del perfil</Label>
            <Input placeholder="Ej: Tarde liviano" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="bg-transparent flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" className="flex-1" disabled={!schedule || !name.trim()} onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
