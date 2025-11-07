/* @ts-nocheck */
import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId, ensureConnected, publishConfig } from '@/lib/mqttServer'
import { eventBus } from '@/lib/eventBus'
import { mergeOverrides, buildJobs } from '@/lib/schedule'

export const runtime = 'nodejs'

// Schema (Mongo collection jobOverrides):
// {
//   deviceId: string,
//   valve: number,
//   at: number,            // original job timestamp (seconds)
//   action: 'suppress' | 'replace',
//   newAt?: number,        // when action=replace
//   newLiters?: number,    // when action=replace
//   createdAt: number,
// }
// Index recommendation (run manually once): db.jobOverrides.createIndex({ deviceId:1, at:1, valve:1 })

export async function GET(req: Request) {
  try {
    const deviceId = getDeviceId()
    const url = new URL(req.url)
    const horizonDays = Math.min(Math.max(Number(url.searchParams.get('horizonDays')) || 8, 1), 30)
    const nowSec = Math.floor(Date.now() / 1000)
    const horizonEnd = nowSec + horizonDays * 24 * 3600

    const overrides = await withDb(async (db) => {
      return db.collection('jobOverrides')
        .find({ deviceId, at: { $gt: nowSec - 24 * 3600, $lt: horizonEnd } })
        .sort({ at: 1 })
        .toArray()
    })

    return NextResponse.json({ ok: true, overrides })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const deviceId = getDeviceId()
    const body = await req.json().catch(() => ({}))
    const action = body.action

    if (action === 'suppress' || action === 'replace') {
      const valve = Number(body.valve)
      const at = Number(body.at)
      if (!Number.isFinite(valve) || valve < 1 || valve > 8) return NextResponse.json({ ok: false, error: 'Invalid valve' }, { status: 400 })
      if (!Number.isFinite(at) || at < 1e9) return NextResponse.json({ ok: false, error: 'Invalid timestamp' }, { status: 400 })

      const doc: any = {
        deviceId,
        valve,
        at,
        action,
        createdAt: Date.now(),
      }
      if (action === 'replace') {
        const newAt = Number(body.newAt)
        const newLiters = Number(body.newLiters)
        if (!Number.isFinite(newAt) || newAt < 1e9) return NextResponse.json({ ok: false, error: 'Invalid newAt' }, { status: 400 })
        if (!Number.isFinite(newLiters) || newLiters <= 0) return NextResponse.json({ ok: false, error: 'Invalid newLiters' }, { status: 400 })
        doc.newAt = newAt
        doc.newLiters = newLiters
      }

      await withDb(async (db) => {
        const col = db.collection('jobOverrides')
        await col.updateOne({ deviceId, valve, at }, { $set: doc }, { upsert: true })
      })
      // Re-publicar jobs ya merged
      const pub = await republishMergedJobs(deviceId)
      return NextResponse.json({ ok: true, override: doc, published: pub?.ok || false, jobsCount: pub?.jobsCount || 0 })
    }

    if (action === 'delete-many') {
      const items: any[] = Array.isArray(body.items) ? body.items : []
      if (!items.length) return NextResponse.json({ ok: false, error: 'No items provided' }, { status: 400 })
      const queries = items.map(i => ({ valve: Number(i.valve), at: Number(i.at) }))
      await withDb(async (db) => {
        const col = db.collection('jobOverrides')
        for (const q of queries) {
          if (!Number.isFinite(q.valve) || !Number.isFinite(q.at)) continue
          await col.deleteOne({ deviceId, valve: q.valve, at: q.at })
        }
      })
      const pub = await republishMergedJobs(deviceId)
      return NextResponse.json({ ok: true, deleted: queries.length, published: pub?.ok || false, jobsCount: pub?.jobsCount || 0 })
    }

    return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const deviceId = getDeviceId()
    const body = await req.json().catch(() => ({}))
    const valve = Number(body.valve)
    const at = Number(body.at)
    if (!Number.isFinite(valve) || !Number.isFinite(at)) return NextResponse.json({ ok: false, error: 'Invalid parameters' }, { status: 400 })

    await withDb(async (db) => {
      await db.collection('jobOverrides').deleteOne({ deviceId, valve, at })
    })

    const pub = await republishMergedJobs(deviceId)
    return NextResponse.json({ ok: true, deleted: 1, published: pub?.ok || false, jobsCount: pub?.jobsCount || 0 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

async function republishMergedJobs(deviceId: string) {
  try {
    ensureConnected()
    // Load valve configs
    const valves = await withDb(async (db) => {
      const arr = await db.collection('configs').find({ deviceId }).toArray()
      const defaultValves = [1, 2, 3, 4].map(id => ({ id, enabled: false, schedule: undefined as any, updatedAt: 0 }))
      arr.filter((d: any) => Number.isFinite(d?.valveId)).forEach((d: any) => {
        const idx = defaultValves.findIndex(v => v.id === d.valveId)
        if (idx >= 0) defaultValves[idx] = { id: d.valveId, enabled: d.enabled !== false, schedule: d.schedule ?? undefined, updatedAt: Number(d.updatedAt) || 0 }
      })
      return defaultValves
    })

    const now = Math.floor(Date.now() / 1000)
    const lastResultByValve: Record<number, number> = {}
    await withDb(async (db) => {
      const events = db.collection('events')
      for (const id of [1,2,3]) {
        const ev = await events.find({ deviceId, type: 'result', 'payload.valve': id }).sort({ ts: -1 }).limit(1).next()
        if (ev && Number.isFinite(ev.ts)) lastResultByValve[id] = Number(ev.ts)
      }
    })

    let jobs: Array<{ at: number; valve: number; liters: number }> = []
  for (const v of (valves || [])) {
      const sch = v.schedule
      const idNum = Number(v.id)
      if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
      const valveKey = `v${idNum}` as 'v1' | 'v2' | 'v3'
      const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
      const persistedAnchor = Number.isFinite((sch as any)?.anchorMs) ? Number((sch as any).anchorMs) : undefined
      const anchorMs = persistedAnchor || lastResultByValve[idNum] || v.updatedAt || Date.now()
      const common = { valveId: valveKey, liters, horizonDays: 7, anchorMs }
      let result: any = { jobs: [] }
      if (sch.mode === 'daily') {
        result = buildJobs({ ...common, mode: 'daily', scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined } as any)
      } else if (sch.mode === 'weekly') {
        result = buildJobs({ ...common, mode: 'weekly', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, weeklyTime: sch.startTime } as any)
      } else if (sch.mode === 'interval') {
        result = buildJobs({ ...common, mode: 'interval', intervalDays: sch.intervalDays, intervalHours: sch.intervalHours, startTime: sch.startTime, scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined, consecutiveWaterings: sch.consecutiveWaterings, wateringIntervalMinutes: sch.wateringIntervalMinutes } as any)
      } else if (sch.mode === 'custom') {
        result = buildJobs({ ...common, mode: 'custom', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined } as any)
      }
      if (Array.isArray(result?.jobs)) jobs.push(...result.jobs)
    }
    jobs = jobs.filter(j => j.at > now)
    jobs.sort((a, b) => a.at - b.at)

    const overrides = await withDb(async (db) => {
      return db.collection('jobOverrides').find({ deviceId, at: { $gt: now - 24 * 3600, $lt: now + 8 * 24 * 3600 } }).toArray()
    })
    if (overrides && overrides.length) jobs = mergeOverrides(jobs as any, overrides as any)

    await publishConfig({ jobs, serverTimeSec: now }, deviceId)
    return { ok: true, jobsCount: jobs.length }
  } catch (e) {
    return { ok: false, error: (e as any)?.message }
  }
}
