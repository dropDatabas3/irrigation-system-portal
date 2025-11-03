import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const deviceId = getDeviceId()
    const doc = await withDb(async (db) => {
      const col = db.collection('tank')
      const t = await col.findOne({ deviceId })
      return t || null
    })
    const current = Number(doc?.currentVolumeLiters) || 0
    const capacity = Number(doc?.capacityLiters) || (current || 0)
    const pct = capacity > 0 ? Math.max(0, Math.min(100, Math.round((current / capacity) * 100))) : 0
    return NextResponse.json({ ok: true, currentLiters: current, capacityLiters: capacity, percent: pct, updatedAt: doc?.updatedAt || null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const deviceId = getDeviceId()
    const body = await req.json().catch(() => null)
    const setVolumeLiters = body?.setVolumeLiters
    const setCapacityLiters = body?.setCapacityLiters
    const now = Date.now()
    const doc = await withDb(async (db) => {
      const col = db.collection('tank')
      const $set: any = { updatedAt: now }
      if (Number.isFinite(setVolumeLiters)) $set.currentVolumeLiters = Number(setVolumeLiters)
      if (Number.isFinite(setCapacityLiters)) $set.capacityLiters = Number(setCapacityLiters)
      await col.updateOne({ deviceId }, { $set, $setOnInsert: { deviceId, createdAt: now } }, { upsert: true })
      return await col.findOne({ deviceId })
    })
    const current = Number(doc?.currentVolumeLiters) || 0
    const capacity = Number(doc?.capacityLiters) || (current || 0)
    const pct = capacity > 0 ? Math.max(0, Math.min(100, Math.round((current / capacity) * 100))) : 0
    return NextResponse.json({ ok: true, currentLiters: current, capacityLiters: capacity, percent: pct, updatedAt: doc?.updatedAt || now })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
