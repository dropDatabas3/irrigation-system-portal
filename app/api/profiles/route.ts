import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'

// List profiles
export async function GET() {
  try {
    const deviceId = getDeviceId()
    const profiles = await withDb(async (db) => {
      const col = db.collection('profiles')
      const arr = await col.find({ deviceId }).project({ _id: 0, deviceId: 0 }).sort({ name: 1 }).toArray()
      return arr
    })
    return NextResponse.json({ ok: true, profiles: profiles || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

// Create or upsert a profile
export async function POST(req: Request) {
  try {
    const deviceId = getDeviceId()
    const body = await req.json().catch(() => null)
    const name = String(body?.name || '').trim()
    const schedule = body?.schedule
    if (!name || !schedule || typeof schedule !== 'object') {
      return NextResponse.json({ ok: false, error: 'Missing name or schedule' }, { status: 400 })
    }
    const now = Date.now()
    await withDb(async (db) => {
      const col = db.collection('profiles')
      await col.updateOne(
        { deviceId, name },
        { $set: { name, schedule, deviceId, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true }
      )
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
