"use client"

import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GlassCard } from '@/components/ui/glass-card'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Edit2, Plus, Save, Droplets, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    globalThis.addEventListener('profiles:open', onOpen)
    return () => globalThis.removeEventListener('profiles:open', onOpen)
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

  const profilesListContent = useMemo(() => {
    if (loading && profiles.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          Cargando perfiles...
        </div>
      )
    }

    if (profiles.length === 0) {
      return (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
          <Sprout className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No hay perfiles guardados</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {profiles.map(p => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={p.name}
            >
              <GlassCard className={cn(
                "p-4 transition-all duration-200",
                selectedProfile === p.name ? "ring-1 ring-primary/50 bg-primary/5" : "hover:bg-white/5"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate text-base">{p.name}</h4>
                      {p.schedule?.mode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground uppercase tracking-wider">
                          {p.schedule.mode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Droplets className="w-3 h-3" />
                      {p.schedule ? 'Configuración guardada' : 'Sin configuración'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={cn("h-8 w-8", selectedProfile === p.name && "text-primary bg-primary/10")}
                      onClick={() => setSelectedProfile(selectedProfile === p.name ? '' : p.name)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(p.name)} 
                      disabled={deleting === p.name}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Edit Mode Expansion */}
                <AnimatePresence>
                  {selectedProfile === p.name && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-white/10">
                        <div className="space-y-3">
                          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Actualizar desde válvula</Label>
                          <div className="flex gap-2">
                            <Select value={replaceFromValve} onValueChange={(v: any) => setReplaceFromValve(v)}>
                              <SelectTrigger className="bg-black/20 border-white/10 h-9">
                                <SelectValue placeholder="Elegir origen..." />
                              </SelectTrigger>
                              <SelectContent>
                                {valves.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              onClick={handleReplaceFromValve} 
                              disabled={!replaceFromValve}
                              className="shrink-0"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Actualizar
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Esto sobrescribirá la configuración del perfil "{p.name}" con la configuración actual de la válvula seleccionada.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  }, [loading, profiles, selectedProfile, deleting, replaceFromValve, valves])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 border-l border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="h-full overflow-y-auto p-6 space-y-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <Sprout className="w-6 h-6 text-green-400" />
              Perfiles de Riego
            </SheetTitle>
          </SheetHeader>

          {/* Create Profile Section */}
          <GlassCard className="p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Plus className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Nuevo Perfil
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nombre del perfil</Label>
                  <Input 
                    placeholder="Ej: Verano Intenso" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Copiar configuración de</Label>
                  <Select value={fromValve} onValueChange={(v: any) => setFromValve(v)}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Seleccionar válvula" />
                    </SelectTrigger>
                    <SelectContent>
                      {valves.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full mt-2" 
                  onClick={handleCreateFromValve} 
                  disabled={creating || !newName.trim() || !fromValve}
                >
                  {creating ? 'Creando...' : 'Crear Perfil'}
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Saved Profiles List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium px-1">Perfiles Guardados</h3>
            
            {profilesListContent}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}