import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId, ensureConnected, publishConfig } from '@/lib/mqttServer'
import { buildJobs } from '@/lib/schedule'

export const runtime = 'nodejs'

// DELETE-like semantics via POST for easier invocation from client
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const valveIdNum = Number(String(id || '').replace(/^v/i, ''))
    if (!Number.isFinite(valveIdNum) || valveIdNum < 1 || valveIdNum > 4) {
      return NextResponse.json({ ok: false, error: 'Invalid valve id' }, { status: 400 })
    }
    const deviceId = getDeviceId()

    // 1) Unset schedule for this valve only (keep enabled/name/zone)
    const updated = await withDb(async (db) => {
      const col = db.collection('configs')
      const res = await col.updateOne(
        { deviceId, valveId: valveIdNum },
        { $unset: { schedule: '' }, $set: { updatedAt: Date.now() } },
        { upsert: false }
      )
      return res?.modifiedCount ?? 0
    })

    // 2) Re-materialize jobs for all valves and publish to device
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
    for (const v of valves || []) {
      const sch = (v as any)?.schedule
      const idNum = Number((v as any)?.id)
      if (!sch || !Number.isFinite(idNum) || idNum < 1 || idNum > 3) continue
      const valveKey = (`v${idNum}`) as 'v1'|'v2'|'v3'
      const liters = Number.isFinite(sch.liters) ? Number(sch.liters) : 0
      const common = { valveId: valveKey, liters, horizonDays: 7 }
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

    return NextResponse.json({ ok: true, modified: updated || 0, jobsCount: futureJobs.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
