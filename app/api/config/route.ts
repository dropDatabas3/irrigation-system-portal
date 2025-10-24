import { NextResponse } from 'next/server'
import { publishConfig, getDeviceId, ensureConnected } from '@/lib/mqttServer'
import { savePostedConfig } from '@/lib/persist'
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
    await savePostedConfig(deviceId, payload)
    await publishConfig(payload, deviceId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const deviceId = getDeviceId()
    const docs = await withDb(async (db) => {
      const col = db.collection('configs')
      return col
        .find({ deviceId })
        .sort({ ts: -1 })
        .limit(1)
        .toArray()
    })
    const last = Array.isArray(docs) && docs.length ? docs[0] : null
    return NextResponse.json({ ok: true, config: last?.payload ?? null, ts: last?.ts ?? null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
