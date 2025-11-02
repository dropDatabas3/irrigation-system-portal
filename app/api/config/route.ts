import { NextResponse } from 'next/server'
import { publishConfig, getDeviceId, ensureConnected } from '@/lib/mqttServer'
import { buildJobs } from '@/lib/schedule'
import { saveConfigCreatedEvent } from '@/lib/persist'
import { withDb } from '@/lib/db'

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
    const valveConfigs: Array<any> = Array.isArray((payload as any)?.valves)
      ? (payload as any).valves
      : []
    
    const allJobs: Array<{ at: number; valve: number; liters: number }> = []
    const now = Math.floor(Date.now() / 1000)
    
    for (const v of valveConfigs) {
      const sch = v.schedule
      const idNum = Number(v.id)
      
      // Skip if no schedule or invalid valve
      if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
      
      const valveKey = `v${idNum}` as 'v1' | 'v2' | 'v3'
      const mode = sch.mode
      const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
      
      const common = { valveId: valveKey, liters, horizonDays: 7 }
      let result: any = { jobs: [] }
      
      try {
        if (mode === 'daily') {
          result = buildJobs({ 
            ...common, 
            mode: 'daily', 
            scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined 
          } as any)
        } else if (mode === 'weekly') {
          result = buildJobs({ 
            ...common, 
            mode: 'weekly', 
            selectedDays: Array.isArray(sch.days) ? sch.days : undefined, 
            weeklyTime: sch.startTime 
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
          } as any)
        } else if (mode === 'custom') {
          result = buildJobs({ 
            ...common, 
            mode: 'custom', 
            selectedDays: Array.isArray(sch.days) ? sch.days : undefined, 
            scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined 
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
    const futureJobs = allJobs.filter(j => j.at > now)
    futureJobs.sort((a, b) => a.at - b.at)
    
    console.log(`[CONFIG POST] Jobs materializados: ${allJobs.length}, futuros: ${futureJobs.length}`)

    // Preparar payload completo con jobs materializados
    const mqttPayload = {
      jobs: futureJobs,
      serverTimeSec: now,
    }

    // Fire-and-forget publish to avoid blocking the HTTP request if MQTT is lento o inaccesible
    ;(async () => {
      try {
        // Esperar como máximo ~2s al broker, luego abandonar para no colgar el request
        await Promise.race([
          publishConfig(mqttPayload, deviceId),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ])
        console.log(`[CONFIG POST] ${futureJobs.length} jobs publicados a MQTT exitosamente`)
      } catch (err) {
        console.error('[CONFIG POST] Error publicando jobs a MQTT:', err)
      }
    })()

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const deviceId = getDeviceId()
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
        .filter(d => Number.isFinite(d?.valveId))
        .forEach(d => {
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
      for (const v of valves) {
        const sch = (v as any)?.schedule
        const idNum = Number((v as any)?.id)
        if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
        const valveKey = (`v${idNum}`) as 'v1'|'v2'|'v3'
        const mode = sch.mode
        // Use liters from schedule if available, else default to 0
        const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
        const common = { valveId: valveKey, liters, horizonDays: 7 }
        let result: any = { jobs: [] as any[] }
        if (mode === 'daily') {
          result = buildJobs({ ...common, mode: 'daily', scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined } as any)
        } else if (mode === 'weekly') {
          result = buildJobs({ ...common, mode: 'weekly', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, weeklyTime: sch.startTime } as any)
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
          } as any)
        } else if (mode === 'custom') {
          result = buildJobs({ ...common, mode: 'custom', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined } as any)
        }
        if (Array.isArray(result?.jobs)) {
          console.log('[GET /api/config] valve', valveKey, 'materialized', result.jobs.length, 'jobs with liters:', liters)
          jobs.push(...result.jobs)
        }
      }
    } catch {}
    jobs.sort((a, b) => (a?.at || 0) - (b?.at || 0))

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
    return {
      mode,
      intervalDays: Number.isFinite(input.intervalDays) ? Number(input.intervalDays) : 0,
      intervalHours: Number.isFinite(input.intervalHours) ? Number(input.intervalHours) : 0,
      startTime: input.startTime ?? '08:00',
      times: Array.isArray(input.times) ? input.times.slice(0, 6) : undefined,
      consecutiveWaterings: Number.isFinite(input.consecutiveWaterings) ? Number(input.consecutiveWaterings) : undefined,
      wateringIntervalMinutes: Number.isFinite(input.wateringIntervalMinutes) ? Number(input.wateringIntervalMinutes) : undefined,
      liters,
    }
  }
  if (mode === 'custom') {
    return { mode, days: Array.isArray(input.days) ? input.days : [], times: Array.isArray(input.times) ? input.times.slice(0, 6) : ['08:00'], liters }
  }
  // Fallback: keep nothing if unknown
  return undefined
}
