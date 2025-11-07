/* @ts-nocheck */
import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId, ensureConnected, publishConfig } from '@/lib/mqttServer'
import { buildJobs } from '@/lib/schedule'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const valveIdNum = Number(String(id || '').replace(/^v/i, ''))
    if (!Number.isFinite(valveIdNum) || valveIdNum < 1 || valveIdNum > 4) {
      return NextResponse.json({ ok: false, error: 'Invalid valve id' }, { status: 400 })
    }
    const body = await req.json().catch(() => null)
    const name = String(body?.name || '').trim()
    if (!name) return NextResponse.json({ ok: false, error: 'Missing profile name' }, { status: 400 })
    const deviceId = getDeviceId()

    // 1) Load profile
    const profile = await withDb(async (db) => {
      const col = db.collection('profiles')
      return await col.findOne({ deviceId, name })
    })
    if (!profile) return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 })

    // 2) Persist schedule to valve config
    await withDb(async (db) => {
      const col = db.collection('configs')
      await col.updateOne(
        { deviceId, valveId: valveIdNum },
        { $set: { schedule: profile.schedule, updatedAt: Date.now() } },
        { upsert: true }
      )
    })

    // 3) Re-materialize and publish jobs like cron/refresh
    const valves = await withDb(async (db) => {
      const col = db.collection('configs')
      const arr = await col.find({ deviceId }).toArray()
      const def = [1, 2, 3, 4].map((id) => ({ id, enabled: false, schedule: undefined as any }))
      for (const d of arr) {
        const idx = def.findIndex((v) => v.id === d.valveId)
        if (idx >= 0) def[idx] = { id: d.valveId, enabled: d.enabled !== false, schedule: d.schedule ?? undefined }
      }
      return def
    })

    const allJobs: Array<{ at: number; valve: number; liters: number }> = []
    const now = Math.floor(Date.now() / 1000)
    // Preserve interval phase: last irrigation result per valve
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
    for (const v of valves || []) {
      const sch = (v as any)?.schedule
      const idNum = Number((v as any)?.id)
      if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
      const valveKey = (`v${idNum}`) as 'v1'|'v2'|'v3'
      const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
  const anchorMs = lastResultByValve[idNum] || Date.now()
  const common = { valveId: valveKey, liters, horizonDays: 7, anchorMs }
      let result: any = { jobs: [] as any[] }
      try {
        if (sch.mode === 'daily') result = buildJobs({ ...common, mode: 'daily', scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined } as any)
        else if (sch.mode === 'weekly') result = buildJobs({ ...common, mode: 'weekly', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, weeklyTime: sch.startTime } as any)
  else if (sch.mode === 'interval') result = buildJobs({ ...common, mode: 'interval', intervalDays: sch.intervalDays, intervalHours: sch.intervalHours, startTime: sch.startTime, scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined, consecutiveWaterings: sch.consecutiveWaterings, wateringIntervalMinutes: sch.wateringIntervalMinutes } as any)
        else if (sch.mode === 'custom') result = buildJobs({ ...common, mode: 'custom', selectedDays: Array.isArray(sch.days) ? sch.days : undefined, scheduleTimes: Array.isArray(sch.times) ? sch.times : undefined } as any)
      } catch {}
      if (Array.isArray(result?.jobs)) allJobs.push(...result.jobs)
    }
    const futureJobs = allJobs.filter((j) => j.at > now).sort((a, b) => a.at - b.at)
    ensureConnected()
    await publishConfig({ jobs: futureJobs, serverTimeSec: now }, deviceId)

    return NextResponse.json({ ok: true, applied: name, jobsCount: futureJobs.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
