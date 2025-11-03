"use client"

import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Profile = { name: string; schedule: any }

export function ProfilesPanel() {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [fromValve, setFromValve] = useState<'v1'|'v2'|'v3'|'v4'|''>('')
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [replaceFromValve, setReplaceFromValve] = useState<'v1'|'v2'|'v3'|'v4'|''>('')
  const [deleting, setDeleting] = useState<string>('')

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('profiles:open', onOpen)
    return () => window.removeEventListener('profiles:open', onOpen)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profiles', { cache: 'no-store' })
      const j = await res.json()
      if (Array.isArray(j?.profiles)) setProfiles(j.profiles)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { if (open) load() }, [open])

  const valves = useMemo(() => ([
    { id: 'v1', label: 'Válvula 1' },
    { id: 'v2', label: 'Válvula 2' },
    { id: 'v3', label: 'Válvula 3' },
  ] as const), [])

  const readValveSchedule = async (valveId: 'v1'|'v2'|'v3'|'v4') => {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' })
      const j = await res.json()
      const arr: any[] = Array.isArray(j?.config?.valves) ? j.config.valves : []
      const num = Number(String(valveId).replace(/^v/i, ''))
      const entry = arr.find(v => Number(v?.id) === num)
      return entry?.schedule || null
    } catch { return null }
  }

  const handleCreateFromValve = async () => {
    if (!newName.trim() || !fromValve) return
    setCreating(true)
    try {
      const schedule = await readValveSchedule(fromValve)
      if (!schedule) return
      await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), schedule }) })
      setNewName('')
      setFromValve('')
      await load()
    } finally { setCreating(false) }
  }

  const handleReplaceFromValve = async () => {
    if (!selectedProfile || !replaceFromValve) return
    try {
      const schedule = await readValveSchedule(replaceFromValve)
      if (!schedule) return
      await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selectedProfile, schedule }) })
      setReplaceFromValve('')
      await load()
    } catch {}
  }

  const handleDelete = async (name: string) => {
    setDeleting(name)
    try {
      await fetch(`/api/profiles/${encodeURIComponent(name)}`, { method: 'DELETE' })
      await load()
    } finally { setDeleting('') }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-5 space-y-6">
        <SheetHeader>
          <SheetTitle>Perfiles de Riego</SheetTitle>
        </SheetHeader>

        <Card className="gradient-border">
          <CardHeader>
            <CardTitle className="text-base">Crear perfil desde una válvula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre del perfil</Label>
                <Input placeholder="Ej: Noche ligera" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Desde válvula</Label>
                <Select value={fromValve} onValueChange={(v: any) => setFromValve(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir" />
                  </SelectTrigger>
                  <SelectContent>
                    {valves.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="button" variant="outline" className="bg-transparent" onClick={handleCreateFromValve} disabled={creating || !newName.trim() || !fromValve}>
              {creating ? 'Creando…' : 'Crear perfil'}
            </Button>
          </CardContent>
        </Card>

        <Card className="gradient-border">
          <CardHeader>
            <CardTitle className="text-base">Perfiles guardados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay perfiles guardados.</p>
            ) : (
              <div className="space-y-3">
                {profiles.map(p => (
                  <div key={p.name} className="flex items-center justify-between gap-3 p-2 rounded-md border border-border">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.schedule?.mode || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" className="bg-transparent" onClick={() => setSelectedProfile(p.name)}>Editar</Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(p.name)} disabled={deleting === p.name}>{deleting === p.name ? 'Eliminando…' : 'Eliminar'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProfile && (
              <div className="p-3 rounded-md bg-secondary/30 border border-border space-y-3">
                <p className="text-sm">Editar: <strong>{selectedProfile}</strong></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Reemplazar contenido con válvula</Label>
                    <Select value={replaceFromValve} onValueChange={(v: any) => setReplaceFromValve(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        {valves.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="bg-transparent" onClick={handleReplaceFromValve} disabled={!replaceFromValve}>Actualizar</Button>
                  <Button type="button" variant="ghost" onClick={() => { setSelectedProfile(''); setReplaceFromValve('') }}>Cerrar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </SheetContent>
    </Sheet>
  )
}
