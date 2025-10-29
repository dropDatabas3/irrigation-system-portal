import { NextResponse } from 'next/server'
import { publishConfig, getDeviceId, ensureConnected } from '@/lib/mqttServer'
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
          ? (payload as any).valves.map((v: any) => ({ id: v.id, enabled: v.enabled, name: v.name, zone: v.zone }))
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

    // Publish only the minimal device payload (avoid DB-only fields)
    const devicePayload = (payload && typeof payload === 'object') ? { valves: Array.isArray((payload as any)?.valves) ? (payload as any).valves.map((v: any) => ({ id: v.id, enabled: v.enabled, name: v.name, zone: v.zone })) : undefined, serverTimeSec: (payload as any).serverTimeSec } : payload
    await publishConfig(devicePayload, deviceId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const deviceId = getDeviceId()
    const valves = await withDb(async (db) => {
      const col = db.collection('configs')
      const cur = col.find({ deviceId })
      const arr = await cur.toArray()
      return arr
        .filter(d => Number.isFinite(d?.valveId))
        .sort((a, b) => a.valveId - b.valveId)
        .map(d => ({ id: d.valveId, enabled: d.enabled !== false, name: d.name ?? undefined, zone: d.zone ?? undefined }))
    })
    return NextResponse.json({ ok: true, config: { valves: valves ?? [] }, ts: Date.now() })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

// Normalize schedule object to minimal persisted shape
function normalizeSchedule(input: any) {
  if (!input || typeof input !== 'object') return undefined
  const mode = input.mode
  if (mode === 'daily') {
    return { mode, times: Array.isArray(input.times) ? input.times.slice(0, 6) : ['08:00'] }
  }
  if (mode === 'weekly') {
    return { mode, days: Array.isArray(input.days) ? input.days : [], startTime: input.startTime ?? '08:00' }
  }
  if (mode === 'interval') {
    return {
      mode,
      intervalDays: Number.isFinite(input.intervalDays) ? Number(input.intervalDays) : 0,
      intervalHours: Number.isFinite(input.intervalHours) ? Number(input.intervalHours) : 0,
      startTime: input.startTime ?? '08:00',
      times: Array.isArray(input.times) ? input.times.slice(0, 6) : undefined,
    }
  }
  if (mode === 'custom') {
    return { mode, days: Array.isArray(input.days) ? input.days : [], times: Array.isArray(input.times) ? input.times.slice(0, 6) : ['08:00'] }
  }
  // Fallback: keep nothing if unknown
  return undefined
}
