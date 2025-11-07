/* @ts-nocheck */
import { NextResponse } from 'next/server'
import { publishConfig, getDeviceId, ensureConnected } from '@/lib/mqttServer'
import { buildJobs, mergeOverrides } from '@/lib/schedule'
import { withDb } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cron Job endpoint: Re-materializa y envía jobs para los próximos 7 días
 * 
 * Este endpoint debe ser llamado cada 24 horas por un servicio externo (Vercel Cron, cron-job.org, etc.)
 * 
 * Funcionalidad:
 * 1. Lee todas las configuraciones de válvulas desde MongoDB
 * 2. Materializa jobs para los próximos 7 días usando buildJobs()
 * 3. Filtra solo jobs futuros (no ejecutados)
 * 4. Publica a MQTT config/set para que el ESP8266 los reciba
 * 
 * Esto permite que el ESP8266 siempre tenga jobs para la próxima semana,
 * incluso si pierde conexión a Internet.
 */
export async function GET(req: Request) {
  try {
    // Verificar autenticación del cron job (opcional pero recomendado)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Iniciando refresh de jobs...')
    
    const deviceId = getDeviceId()
    ensureConnected()

    // 1. Leer configuraciones de válvulas desde MongoDB
    const valves = await withDb(async (db) => {
      const col = db.collection('configs')
      const cursor = col.find({ deviceId })
      const arr = await cursor.toArray()
      
      // Default: 4 valves disabled
      const defaultValves = [1, 2, 3, 4].map(id => ({ 
        id, 
        enabled: false, 
        schedule: undefined as any,
        updatedAt: 0,
      }))
      
      // Merge with existing configs
      arr
  .filter((d: any) => Number.isFinite(d?.valveId))
  .forEach((d: any) => {
          const idx = defaultValves.findIndex(v => v.id === d.valveId)
          if (idx >= 0) {
            defaultValves[idx] = { 
              id: d.valveId, 
              enabled: d.enabled !== false, 
              schedule: d.schedule ?? undefined,
              updatedAt: Number(d.updatedAt) || 0,
            }
          }
        })
      
      return defaultValves
    })

    // 2. Materializar jobs para los próximos 7 días
    const allJobs: Array<{ at: number; valve: number; liters: number }> = []
    const now = Math.floor(Date.now() / 1000)
    
    if (!valves || !Array.isArray(valves)) {
      console.warn('[CRON] No se pudieron leer válvulas de MongoDB')
      return NextResponse.json({ 
        ok: false, 
        error: 'No valve configurations found' 
      }, { status: 404 })
    }
    
    // Lookup last irrigation result per valve to preserve interval phase
    const lastResultByValve: Record<number, number> = {}
    await withDb(async (db) => {
      const events = db.collection('events')
      for (const id of [1,2,3]) {
        const ev = await events.find({ deviceId, type: 'result', 'payload.valve': id }).sort({ ts: -1 }).limit(1).next()
        if (ev && Number.isFinite(ev.ts)) lastResultByValve[id] = Number(ev.ts)
      }
    })

    for (const v of valves) {
      const sch = v.schedule
      const idNum = Number(v.id)
      
      // Skip if no schedule or invalid valve
      if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
      
      const valveKey = `v${idNum}` as 'v1' | 'v2' | 'v3'
      const mode = sch.mode
      const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
      
  const anchorMs = lastResultByValve[idNum] || v.updatedAt || Date.now()
    // Prefer persisted anchorMs from schedule to preserve phase; fallback to last result/updatedAt
    const persistedAnchor = Number.isFinite((sch as any)?.anchorMs) ? Number((sch as any).anchorMs) : undefined
    const common = { valveId: valveKey, liters, horizonDays: 7, anchorMs: persistedAnchor || anchorMs }
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
        console.error(`[CRON] Error building jobs for valve ${idNum}:`, err)
      }
    }

    // 3. Filtrar solo jobs futuros
  let futureJobs = allJobs.filter(j => j.at > now)
    
    // 4. Ordenar por timestamp
    futureJobs.sort((a, b) => a.at - b.at)

    // Merge overrides (suppress/replace) before publishing
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

    console.log(`[CRON] Jobs materializados: ${allJobs.length}, futuros: ${futureJobs.length}`)

    // 5. Preparar payload para MQTT
    const payload = {
      jobs: futureJobs,
      serverTimeSec: now,
    }

    // 6. Publicar a MQTT config/set
    try {
      await Promise.race([
        publishConfig(payload, deviceId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MQTT timeout')), 5000)),
      ])
      
      console.log('[CRON] Jobs publicados exitosamente a MQTT')
      
      return NextResponse.json({ 
        ok: true, 
        jobsCount: futureJobs.length,
        nextRun: futureJobs.length > 0 ? new Date(futureJobs[0].at * 1000).toISOString() : null,
        message: `${futureJobs.length} jobs enviados al ESP8266`
      })
    } catch (mqttErr: any) {
      console.error('[CRON] Error publicando a MQTT:', mqttErr)
      
      return NextResponse.json({ 
        ok: false, 
        error: 'MQTT publish failed',
        details: mqttErr?.message,
        jobsCount: futureJobs.length
      }, { status: 500 })
    }
  } catch (e: any) {
    console.error('[CRON] Error en refresh-jobs:', e)
    
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Server error' 
    }, { status: 500 })
  }
}

// También soportar POST para mayor compatibilidad con servicios de cron
export async function POST(req: Request) {
  return GET(req)
}
