"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Droplets, Pencil, Trash2, CheckSquare, XSquare, X, Check } from "lucide-react"
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useIrrigationEvents } from "@/lib/useEvents"
import { useEffect, useState } from "react"
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { fetchConfigDedupe } from "@/lib/config-client"

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

export function NextRuns() {
  const { lastConfigAck } = useIrrigationEvents()
  const [jobs, setJobs] = useState<Array<{ at: number; valve: number; liters?: number }>>([])
  const [didFetch, setDidFetch] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [editJob, setEditJob] = useState<{ at: number; valve: number; liters?: number } | null>(null)
  const [editAt, setEditAt] = useState('')
  const [editLiters, setEditLiters] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [overridesVersion, setOverridesVersion] = useState(0)

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

  function keyFor(j: { at: number; valve: number }) { return `${j.valve}|${j.at}` }

  function toggleSelect(j: { at: number; valve: number }) {
    setSelected(s => ({ ...s, [keyFor(j)]: !s[keyFor(j)] }))
  }

  function clearSelection() { setSelected({}) }

  const selectedCount = Object.values(selected).filter(Boolean).length

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
      await fetch('/api/job-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete-many', items }) })
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

  return (
    <Card className="gradient-border">
      <CardHeader>
        <CardTitle className="text-foreground">Próximos Riegos</CardTitle>
        {items.length > 0 && (<CardDescription>Próximas 10 ejecuciones programadas {selectedCount > 0 && `(${selectedCount} seleccionados)`}</CardDescription>)}
        {selectedCount > 0 && (
          <div className="flex gap-2 mt-2">
            <Button variant="destructive" size="sm" disabled={submitting} onClick={handleDeleteSelected}><Trash2 className="w-4 h-4" /> Borrar</Button>
            <Button variant="outline" size="sm" disabled={submitting} onClick={clearSelection}><X className="w-4 h-4" /> Cancelar</Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay riegos próximos programados</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((j, idx) => (
              <div key={idx} className={`flex flex-col gap-2 p-3 rounded-lg bg-secondary/40 border border-border ${selected[keyFor(j)] ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => toggleSelect(j)}>
                      {numValveToLabel(j.valve)}
                    </Badge>
                    <div className="text-sm">
                      <div className="text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        {formatWhen(j.at)}
                      </div>
                      {Number.isFinite(j.liters) && j.liters! > 0 ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Droplets className="w-3 h-3" /> {j.liters} L
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(j)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => suppressJob(j)} title="Omitir"><Trash2 className="w-4 h-4" /></Button>
                    <Button variant={selected[keyFor(j)] ? 'secondary' : 'ghost'} size="icon" onClick={() => toggleSelect(j)} title="Seleccionar"><CheckSquare className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Sheet open={!!editJob} onOpenChange={(o) => { if (!o) setEditJob(null) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar Riego</SheetTitle>
          </SheetHeader>
          {editJob && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-medium">Fecha/Hora nueva</label>
                <Input type="datetime-local" value={editAt} onChange={e => setEditAt(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">Litros</label>
                <Input type="number" min={0} step={0.1} value={editLiters} onChange={e => setEditLiters(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditJob(null)} disabled={submitting}><X className="w-4 h-4" /> Cancelar</Button>
                <Button onClick={submitEdit} disabled={submitting}><Check className="w-4 h-4" /> Guardar</Button>
              </div>
            </div>
          )}
          <SheetFooter></SheetFooter>
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
          <p className="text-red-500">Acción potencialmente irreversible para el día actual.</p>
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
          <p>Válvula: {numValveToLabel(confirmSingleOpen.valve)}</p>
          <p>Programado: {formatWhen(confirmSingleOpen.at)}</p>
          <p>Este riego no se ejecutará en el dispositivo.</p>
        </> : null}
        confirmLabel="Omitir"
        cancelLabel="Cancelar"
        onConfirm={doSingleSuppress}
        onCancel={() => !confirmBusy && setConfirmSingleOpen(null)}
      />
    </Card>
  )
}
