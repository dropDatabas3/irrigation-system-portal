"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, Droplets, Pencil, Trash2, X, Check, Calendar } from "lucide-react"
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useIrrigationEvents } from "@/lib/useEvents"
import { useEffect, useState, useId } from "react"
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { fetchConfigDedupe } from "@/lib/config-client"
import { GlassCard } from "@/components/ui/glass-card"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

function numValveToLabel(v: number) {
  if (v === 1) return "V1"
  if (v === 2) return "V2"
  if (v === 3) return "V3"
  return `V${v}`
}

function formatWhen(tsSec: number) {
  const d = new Date(tsSec * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Hoy ${time}`
  if (isTomorrow) return `Mañana ${time}`
  return `${d.toLocaleDateString()} ${time}`
}

function keyFor(j: { at: number; valve: number }) { return `${j.valve}|${j.at}` }

export function NextRuns() {
  useIrrigationEvents() // Keep subscription active but ignore return
  const [jobs, setJobs] = useState<Array<{ at: number; valve: number; liters?: number }>>([])
  const [didFetch, setDidFetch] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [editJob, setEditJob] = useState<{ at: number; valve: number; liters?: number } | null>(null)
  const [editAt, setEditAt] = useState('')
  const [editLiters, setEditLiters] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [overridesVersion, setOverridesVersion] = useState(0)
  
  const editDateId = useId()
  const editLitersId = useId()

  // Always fetch jobs from API (device ack doesn't contain materialized jobs, only schedule metadata)
  useEffect(() => {
    if (didFetch && overridesVersion === 0) return
    let cancelled = false
    ;(async () => {
      try {
        console.log('[NextRuns] fetching jobs from API...')
        const json = await fetchConfigDedupe().catch(() => null as any)
        const arr: Array<any> = Array.isArray(json?.config?.jobs) ? json.config.jobs : []
        console.log('[NextRuns] received', arr.length, 'jobs from API')
        if (!cancelled) {
          setJobs(arr.map((j: any) => ({ at: Number(j?.at), valve: Number(j?.valve), liters: Number(j?.liters) })))
          setDidFetch(true)
        }
      } catch (err) {
        console.error('[NextRuns] fetch failed:', err)
        if (!cancelled) { setJobs([]); setDidFetch(true) }
      }
    })()
    return () => { cancelled = true }
  }, [didFetch, overridesVersion])

  const items = (() => {
    const future = jobs
      .filter((j) => Number.isFinite(j.at) && j.at * 1000 > Date.now())
      .sort((a, b) => a.at - b.at)
      .slice(0, 10)
    console.log('[NextRuns] displaying', future.length, 'upcoming jobs')
    return future
  })()

  const selectedCount = Object.values(selected).filter(Boolean).length
  const selectedJobs = items.filter(j => selected[`${j.valve}|${j.at}`])

  function selectOne(j: { at: number; valve: number }) {
    setSelected({ [keyFor(j)]: true })
  }

  function toggleOne(j: { at: number; valve: number }) {
    setSelected(s => ({ ...s, [keyFor(j)]: !s[keyFor(j)] }))
  }

  function clearSelection() { setSelected({}) }

  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)
  const [confirmSingleOpen, setConfirmSingleOpen] = useState<{ at: number; valve: number } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  async function handleDeleteSelected() {
    const items = Object.entries(selected).filter(([_, v]) => v).map(([k]) => {
      const [valve, at] = k.split('|').map(Number)
      return { valve, at }
    })
    if (items.length === 0) return
    setConfirmBulkOpen(true)
  }

  function openEdit(j: { at: number; valve: number; liters?: number }) {
    setEditJob(j)
    const d = new Date(j.at * 1000)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    setEditAt(`${yyyy}-${mm}-${dd}T${hh}:${mi}`)
    setEditLiters(String(j.liters || ''))
  }

  async function submitEdit() {
    if (!editJob) return
    setSubmitting(true)
    try {
      const dt = new Date(editAt)
      const newAtSec = Math.floor(dt.getTime() / 1000)
      const newLiters = Number(editLiters)
      await fetch('/api/job-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'replace', valve: editJob.valve, at: editJob.at, newAt: newAtSec, newLiters }) })
      setEditJob(null)
      setOverridesVersion(v => v + 1)
    } catch (e) { console.error('replace override failed', e) } finally { setSubmitting(false) }
  }

  async function suppressJob(j: { at: number; valve: number }) {
    setConfirmSingleOpen({ at: j.at, valve: j.valve })
  }

  async function doBulkDelete() {
    const items = Object.entries(selected).filter(([_, v]) => v).map(([k]) => {
      const [valve, at] = k.split('|').map(Number)
      return { valve, at }
    })
    setConfirmBusy(true)
    try {
      const res = await fetch('/api/job-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete-many', items }) })
      const j = await res.json().catch(() => null)
      if (j?.ok) console.info(`[NextRuns] delete-many: suppressed=${j.suppressed} upserted=${j.upserted} published=${j.published} jobsCount=${j.jobsCount}`)
      clearSelection()
      setOverridesVersion(v => v + 1)
    } catch (e) { console.error('delete-many failed', e) } finally { setConfirmBusy(false); setConfirmBulkOpen(false) }
  }

  async function doSingleSuppress() {
    if (!confirmSingleOpen) return
    setConfirmBusy(true)
    try {
      await fetch('/api/job-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'suppress', valve: confirmSingleOpen.valve, at: confirmSingleOpen.at }) })
      setOverridesVersion(v => v + 1)
    } catch (e) { console.error('suppress failed', e) } finally { setConfirmBusy(false); setConfirmSingleOpen(null) }
  }

  function handleItemClick(j: { at: number; valve: number }) {
    if (selectedCount === 0) selectOne(j)
    else toggleOne(j)
  }

  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    function onDocPointerDown(e: any) {
      if (selectedCount === 0) return
      if (!rootEl) return
      if (!rootEl.contains(e.target)) clearSelection()
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [rootEl, selectedCount])

  return (
    <GlassCard className="p-6" ref={setRootEl as any}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Próximos Riegos
          </h2>
          {items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Próximas 10 ejecuciones {selectedCount > 0 && `(${selectedCount} seleccionados)`}
            </p>
          )}
        </div>
        
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              {selectedCount === 1 ? (
                <>
                  <Button variant="secondary" size="sm" disabled={submitting} onClick={() => { const j = selectedJobs[0]; if (j) openEdit(j) }}>
                    <Pencil className="w-4 h-4 mr-1" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" disabled={submitting} onClick={() => { const j = selectedJobs[0]; if (j) suppressJob(j) }}>
                    <Trash2 className="w-4 h-4 mr-1" /> Borrar
                  </Button>
                </>
              ) : (
                <Button variant="destructive" size="sm" disabled={submitting} onClick={handleDeleteSelected}>
                  <Trash2 className="w-4 h-4 mr-1" /> Borrar ({selectedCount})
                </Button>
              )}
              <Button variant="ghost" size="sm" disabled={submitting} onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="min-h-[100px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No hay riegos próximos programados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {items.map((j, index) => {
                const k = keyFor(j)
                const isSel = !!selected[k]
                return (
                  <motion.button
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    key={k}
                    type="button"
                    className={cn(
                      "relative text-left flex flex-col gap-2 p-4 rounded-xl border transition-all duration-200 group",
                      isSel 
                        ? "bg-primary/10 border-primary/50 shadow-[0_0_0_1px_var(--primary)]" 
                        : "bg-card/40 border-white/5 hover:bg-card/60 hover:border-white/10"
                    )}
                    onClick={() => handleItemClick(j)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full transition-colors",
                          isSel ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground group-hover:bg-white/10"
                        )}>
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {formatWhen(j.at)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-white/10 bg-white/5">
                              {numValveToLabel(j.valve)}
                            </Badge>
                            {Number.isFinite(j.liters) && j.liters! > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Droplets className="w-3 h-3" /> {j.liters} L
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Selection Indicator */}
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                        isSel ? "border-primary bg-primary text-primary-foreground" : "border-white/20 bg-transparent"
                      )}>
                        {isSel && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Sheet open={!!editJob} onOpenChange={(o) => { if (!o) setEditJob(null) }}>
        <SheetContent className="border-l border-white/10 bg-card/95 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle>Editar Riego</SheetTitle>
          </SheetHeader>
          {editJob && (
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <label htmlFor={editDateId} className="text-sm font-medium text-muted-foreground">Fecha y Hora</label>
                <Input 
                  id={editDateId}
                  type="datetime-local" 
                  value={editAt} 
                  onChange={e => setEditAt(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary/50" 
                />
              </div>
              <div className="space-y-2">
                <label htmlFor={editLitersId} className="text-sm font-medium text-muted-foreground">Cantidad (Litros)</label>
                <div className="relative">
                  <Input 
                    id={editLitersId}
                    type="number" 
                    min={0} 
                    step={0.1} 
                    value={editLiters} 
                    onChange={e => setEditLiters(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-primary/50 pl-9" 
                  />
                  <Droplets className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setEditJob(null)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={submitEdit} disabled={submitting}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmBulkOpen}
        destructive
        loading={confirmBusy}
        title="Eliminar riegos seleccionados"
        description={<>
          <p>Se omitirán {selectedCount} riego(s) futuros.</p>
          <p>Los riegos omitidos no se ejecutarán en el dispositivo.</p>
          <p className="text-red-500 mt-2 font-medium">Acción potencialmente irreversible para el día actual.</p>
        </>}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={doBulkDelete}
        onCancel={() => !confirmBusy && setConfirmBulkOpen(false)}
      />
      <ConfirmDialog
        open={!!confirmSingleOpen}
        destructive
        loading={confirmBusy}
        title="Omitir riego"
        description={confirmSingleOpen ? <>
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 mb-2">
            <p className="font-medium text-destructive">Válvula: {numValveToLabel(confirmSingleOpen.valve)}</p>
            <p className="text-sm text-muted-foreground">Programado: {formatWhen(confirmSingleOpen.at)}</p>
          </div>
          <p>Este riego no se ejecutará en el dispositivo.</p>
        </> : null}
        confirmLabel="Omitir"
        cancelLabel="Cancelar"
        onConfirm={doSingleSuppress}
        onCancel={() => !confirmBusy && setConfirmSingleOpen(null)}
      />
    </GlassCard>
  )
}
