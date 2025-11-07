/* @ts-nocheck */
import { NextResponse } from 'next/server'
import { publishConfig, publishCmd, getDeviceId, ensureConnected } from '@/lib/mqttServer'
import { buildJobs, mergeOverrides } from '@/lib/schedule'
import { saveConfigCreatedEvent } from '@/lib/persist'
import { withDb } from '@/lib/db'
import { eventBus } from '@/lib/eventBus'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const bodyText = await req.text()
    let payload: any = null
    try {
      payload = JSON.parse(bodyText)
    } catch {
      // Keep raw string if not JSON
      payload = bodyText
    }

    ensureConnected()
    const deviceId = getDeviceId()
    // If JSON payload, attach serverTimeSec to help device set/anchor its clock when needed
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      payload = { ...payload, serverTimeSec: Math.floor(Date.now() / 1000) }
    }
    // Persist per-valve configuration (upsert 1 doc per valve)
    await withDb(async (db) => {
      const col = db.collection('configs')
      const now = Date.now()
      const valveConfigs: Array<any> = Array.isArray((payload as any)?.valveConfigs)
        ? (payload as any).valveConfigs
        : Array.isArray((payload as any)?.valves)
          ? (payload as any).valves.map((v: any) => ({ id: v.id, enabled: v.enabled, name: v.name, zone: v.zone, schedule: v.schedule }))
          : []

      for (const v of valveConfigs) {
        if (!v || !Number.isFinite(v.id)) continue
        const doc = {
          deviceId,
          valveId: Number(v.id),
          enabled: v.enabled !== false,
          name: v.name ?? null,
          zone: v.zone ?? null,
          // Persist only necessary schedule fields if provided
          schedule: v.schedule ? normalizeSchedule(v.schedule) : undefined,
          updatedAt: now,
        }
        await col.updateOne(
          { deviceId, valveId: Number(v.id) },
          { $set: doc },
          { upsert: true }
        )
      }
    })

    // Emit a lightweight event for auditing: configuration created/updated
    try {
      const info = { valves: Array.isArray((payload as any)?.valves) ? (payload as any).valves.map((v: any) => ({ id: v.id, enabled: v.enabled })) : undefined }
      await saveConfigCreatedEvent(deviceId, info)
    } catch {}

    // Materializar jobs para los próximos 7 días y enviar al ESP8266
    // Preferir TZ enviada por el navegador si está disponible
    const tzOffsetRaw = (payload && typeof payload === 'object') ? (payload as any).tzOffsetMinutes : undefined
    const tzOffsetMinutes = (Number.isFinite(tzOffsetRaw) && Math.abs(Number(tzOffsetRaw)) <= 14 * 60) ? Number(tzOffsetRaw) : undefined
    const valveConfigs: Array<any> = Array.isArray((payload as any)?.valves)
      ? (payload as any).valves
      : []
    
    const allJobs: Array<{ at: number; valve: number; liters: number }> = []
    const now = Math.floor(Date.now() / 1000)
    // Preload last irrigation result per valve to preserve phase on interval
    const lastResultByValve: Record<number, number> = {}
    try {
      await withDb(async (db) => {
        const events = db.collection('events')
        for (const id of [1,2,3]) {
          const ev = await events.find({ deviceId, type: 'result', 'payload.valve': id }).sort({ ts: -1 }).limit(1).next()
          if (ev && Number.isFinite(ev.ts)) lastResultByValve[id] = Number(ev.ts)
        }
      })
    } catch {}
    
    for (const v of valveConfigs) {
      const sch = v.schedule
      const idNum = Number(v.id)
      
      // Skip if no schedule or invalid valve
      if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
      
      const valveKey = `v${idNum}` as 'v1' | 'v2' | 'v3'
      const mode = sch.mode
  const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
      
  const persistedAnchor = Number.isFinite((sch as any)?.anchorMs) ? Number((sch as any).anchorMs) : undefined
  const anchorMs = persistedAnchor || lastResultByValve[idNum] || Date.now()
  const common = { valveId: valveKey, liters, horizonDays: 7, anchorMs }
      let result: any = { jobs: [] }
      
      try {
        if (mode === 'daily') {
          result = buildJobs({ 
            ...common, 
            mode: 'daily', 
            scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined,
            tzOffsetMinutes,
          } as any)
        } else if (mode === 'weekly') {
          result = buildJobs({ 
            ...common, 
            mode: 'weekly', 
            selectedDays: Array.isArray(sch.days) ? sch.days : undefined, 
            weeklyTime: sch.startTime,
            tzOffsetMinutes,
          } as any)
        } else if (mode === 'interval') {
          result = buildJobs({ 
            ...common, 
            mode: 'interval', 
            intervalDays: sch.intervalDays, 
            intervalHours: sch.intervalHours, 
            startTime: sch.startTime, 
            scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined,
            consecutiveWaterings: sch.consecutiveWaterings,
            wateringIntervalMinutes: sch.wateringIntervalMinutes,
            tzOffsetMinutes,
          } as any)
        } else if (mode === 'custom') {
          result = buildJobs({ 
            ...common, 
            mode: 'custom', 
            selectedDays: Array.isArray(sch.days) ? sch.days : undefined, 
            scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined,
            tzOffsetMinutes,
          } as any)
        }
        
        if (Array.isArray(result?.jobs)) {
          allJobs.push(...result.jobs)
        }
      } catch (err) {
        console.error(`[CONFIG POST] Error building jobs for valve ${idNum}:`, err)
      }
    }
    
    // Filtrar solo jobs futuros
    let futureJobs = allJobs.filter(j => j.at > now)
    futureJobs.sort((a, b) => a.at - b.at)

    // Aplicar overrides persistidos (suppress/replace)
    try {
      await withDb(async (db) => {
        const col = db.collection('jobOverrides')
        const horizonEnd = now + 8 * 24 * 3600
        const overrides = await col.find({ deviceId, at: { $gt: now - 24 * 3600, $lt: horizonEnd } }).toArray()
        if (overrides && overrides.length) {
          futureJobs = mergeOverrides(futureJobs as any, overrides as any)
        }
      })
    } catch {}
    
    console.log(`[CONFIG POST] Jobs materializados: ${allJobs.length}, futuros: ${futureJobs.length}`)

    // Preparar payload completo con jobs materializados
    const mqttPayload = {
      jobs: futureJobs,
      serverTimeSec: now,
    }

    // Seguridad: handshake con ACK de la placa y reintentos
    ensureConnected()

    function waitForAck(expectedCount: number, timeoutMs = 5000): Promise<any | null> {
      return new Promise((resolve) => {
        let done = false
        const off = eventBus.onEvent((evt) => {
          if (evt.type === 'config-ack' && evt?.payload && typeof evt.payload === 'object') {
            // payload puede ser completo { ok:true, jobs:[...] } o compacto { ok:true, jobsCount:n, next?, note }
            const p = (evt.payload as any)
            const jobs = Array.isArray(p.jobs) ? p.jobs : []
            const count = Number.isFinite(p.jobsCount) ? Number(p.jobsCount) : jobs.length
            if (count === expectedCount) {
              if (!done) { done = true; off(); resolve(evt.payload) }
            }
          }
        })
        setTimeout(() => { if (!done) { done = true; off(); resolve(null) } }, timeoutMs)
      })
    }

    function sameJobs(a: Array<any>, b: Array<any>) {
      if (a.length !== b.length) return false
      const key = (j: any) => `${j.at}|${j.valve}|${Number(j.liters).toFixed(3)}`
      const sa = a.map(key).sort()
      const sb = b.map(key).sort()
      for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false
      return true
    }

    let ack: any | null = null
    let attempt = 0
    const maxAttempts = 3

    while (attempt < maxAttempts) {
      attempt++
      try {
        await publishConfig(mqttPayload, deviceId)
      } catch (e) {
        if (attempt >= maxAttempts) {
          return NextResponse.json({ ok: false, error: 'MQTT no conectado o publicación fallida' }, { status: 503 })
        }
      }

  ack = await waitForAck(futureJobs.length, 5000)
      if (ack) {
        const p: any = ack
        const jobs = Array.isArray(p.jobs) ? p.jobs : []
        const count = Number.isFinite(p.jobsCount) ? Number(p.jobsCount) : jobs.length
        // Validación: aceptar si coincide la cantidad; cuando haya lista completa, además validar contenido
        if (count === futureJobs.length) {
          if (jobs.length > 0) {
            if (sameJobs(jobs, futureJobs)) {
              break
            }
          } else {
            // ACK compacto sin jobs, aceptamos
            break
          }
        }
      }
      // backoff simple
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }

    const ok = !!(ack && (
      (Array.isArray((ack as any).jobs) && sameJobs((ack as any).jobs, futureJobs)) ||
      (Number.isFinite((ack as any).jobsCount) && (ack as any).jobsCount === futureJobs.length)
    ))

    // Opcional: verificación adicional get-jobs (rápida, 3s)
    let verify: any | null = null
    try {
      const verifyResp = await new Promise<any>((resolve, reject) => {
        let finished = false
        const off = eventBus.onEvent((evt) => {
          if (evt.type === 'status' && (evt as any)?.payload?.action === 'get-jobs') {
            if (!finished) { finished = true; off(); resolve((evt as any).payload) }
          }
        })
        publishCmd({ action: 'get-jobs' } as any, deviceId).catch((err) => {
          if (!finished) { finished = true; off(); reject(err) }
        })
        setTimeout(() => { if (!finished) { finished = true; off(); resolve(null) } }, 3000)
      })
      verify = verifyResp
    } catch {}

    return NextResponse.json({ ok, ackJobs: ack?.jobs?.length ?? 0, verified: !!verify, verifySample: Array.isArray(verify?.jobs) ? verify.jobs.slice(0, 3) : null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const deviceId = getDeviceId()
    // Intentar usar timezone del cliente desde cabecera opcional
    let tzOffsetMinutes: number | undefined = undefined
    try {
      const hdr = req.headers.get('x-tz-offset-minutes')
      if (hdr !== null) {
        const n = Number(hdr)
        if (!Number.isNaN(n) && Math.abs(n) <= 14 * 60) tzOffsetMinutes = n
      }
    } catch {}
    // Fast-fail DB read to avoid pending requests
      const valvesFromDb = await Promise.race([
      withDb(async (db) => {
      const col = db.collection('configs')
      const cur = col.find({ deviceId })
        const arr = await cur.toArray()
      // Default: 4 valves disabled
      const defaultValves = [1, 2, 3, 4].map(id => ({ id, enabled: false, name: undefined, zone: undefined, schedule: undefined as any }))
      // Merge with existing configs
      arr
        .filter((d: any) => Number.isFinite(d?.valveId))
        .forEach((d: any) => {
          const idx = defaultValves.findIndex(v => v.id === d.valveId)
          if (idx >= 0) {
            defaultValves[idx] = { id: d.valveId, enabled: d.enabled !== false, name: d.name ?? undefined, zone: d.zone ?? undefined, schedule: d.schedule ?? undefined }
          }
        })
        return defaultValves
      }),
      new Promise<any>((resolve) => setTimeout(() => resolve(null), 1500)),
    ])
    let valves = valvesFromDb as any[] | null
    // Fallback when DB is not configured or unreachable: return 4 válvulas deshabilitadas
    if (!valves || !Array.isArray(valves) || valves.length === 0) {
      valves = [1, 2, 3, 4].map(id => ({ id, enabled: false, name: undefined, zone: undefined, schedule: undefined as any }))
    }
    // Materialize jobs (at least timestamps) from saved schedules for 7 días
    const jobs: Array<{ at: number; valve: number; liters?: number }> = []
    try {
      // Preserve interval phase in preview using last result when available
      const lastResultByValve: Record<number, number> = {}
      try {
        await withDb(async (db) => {
          const events = db.collection('events')
          for (const id of [1,2,3]) {
            const ev = await events.find({ deviceId, type: 'result', 'payload.valve': id }).sort({ ts: -1 }).limit(1).next()
            if (ev && Number.isFinite(ev.ts)) lastResultByValve[id] = Number(ev.ts)
          }
        })
      } catch {}
      for (const v of valves) {
        const sch = (v as any)?.schedule
        const idNum = Number((v as any)?.id)
        if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
        const valveKey = (`v${idNum}`) as 'v1'|'v2'|'v3'
  const mode = sch.mode
  // Use liters from schedule if available, else default to 0
  const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
  const persistedAnchor = Number.isFinite((sch as any)?.anchorMs) ? Number((sch as any).anchorMs) : undefined
  const anchorMs = persistedAnchor || lastResultByValve[idNum] || Number((v as any)?.updatedAt) || Date.now()
  const common = { valveId: valveKey, liters, horizonDays: 7, anchorMs }
        let result: any = { jobs: [] as any[] }
        if (mode === 'daily') {
          result = buildJobs({ ...common, mode: 'daily', scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined, tzOffsetMinutes } as any)
        } else if (mode === 'weekly') {
          result = buildJobs({ ...common, mode: 'weekly', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, weeklyTime: sch.startTime, tzOffsetMinutes } as any)
        } else if (mode === 'interval') {
          result = buildJobs({ 
            ...common, 
            mode: 'interval', 
            intervalDays: sch.intervalDays, 
            intervalHours: sch.intervalHours, 
            startTime: sch.startTime, 
            scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined,
            consecutiveWaterings: sch.consecutiveWaterings,
            wateringIntervalMinutes: sch.wateringIntervalMinutes,
            tzOffsetMinutes,
          } as any)
        } else if (mode === 'custom') {
          result = buildJobs({ ...common, mode: 'custom', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined, tzOffsetMinutes } as any)
        }
        if (Array.isArray(result?.jobs)) {
          console.log('[GET /api/config] valve', valveKey, 'materialized', result.jobs.length, 'jobs with liters:', liters)
          jobs.push(...result.jobs)
        }
      }
    } catch {}
    jobs.sort((a, b) => (a?.at || 0) - (b?.at || 0))

    // Aplicar overrides en la vista previa
    try {
      const nowSec = Math.floor(Date.now() / 1000)
      await withDb(async (db) => {
        const col = db.collection('jobOverrides')
        const horizonEnd = nowSec + 8 * 24 * 3600
        const overrides = await col.find({ deviceId, at: { $gt: nowSec - 24 * 3600, $lt: horizonEnd } }).toArray()
        if (overrides && overrides.length) {
          const merged = mergeOverrides(jobs as any, overrides as any)
          jobs.length = 0
          jobs.push(...merged)
        }
      })
    } catch {}

    return NextResponse.json(
      { ok: true, config: { valves: valves ?? [], jobs }, ts: Date.now() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

// Normalize schedule object to minimal persisted shape
function normalizeSchedule(input: any) {
  if (!input || typeof input !== 'object') return undefined
  const mode = input.mode
  // ALWAYS preserve liters if provided
  const liters = Number.isFinite(input.liters) ? Number(input.liters) : undefined
  if (mode === 'daily') {
    return { mode, times: Array.isArray(input.times) ? input.times.slice(0, 6) : ['08:00'], liters }
  }
  if (mode === 'weekly') {
    return { mode, days: Array.isArray(input.days) ? input.days : [], startTime: input.startTime ?? '08:00', liters }
  }
  if (mode === 'interval') {
    // anchorMs: persist initial creation moment to preserve interval phase across regenerations.
    // Keep existing anchorMs if provided to avoid resetting phase when user edits other fields.
    const existingAnchor = Number.isFinite(input.anchorMs) ? Number(input.anchorMs) : undefined
    const anchorMs = existingAnchor || Date.now()
    return {
      mode,
      intervalDays: Number.isFinite(input.intervalDays) ? Number(input.intervalDays) : 0,
      intervalHours: Number.isFinite(input.intervalHours) ? Number(input.intervalHours) : 0,
      startTime: input.startTime ?? '08:00',
      times: Array.isArray(input.times) ? input.times.slice(0, 6) : undefined,
      consecutiveWaterings: Number.isFinite(input.consecutiveWaterings) ? Number(input.consecutiveWaterings) : undefined,
      wateringIntervalMinutes: Number.isFinite(input.wateringIntervalMinutes) ? Number(input.wateringIntervalMinutes) : undefined,
      liters,
      anchorMs,
    }
  }
  if (mode === 'custom') {
    return { mode, days: Array.isArray(input.days) ? input.days : [], times: Array.isArray(input.times) ? input.times.slice(0, 6) : ['08:00'], liters }
  }
  // Fallback: keep nothing if unknown
  return undefined
}
