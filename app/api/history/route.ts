import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)
    const type = url.searchParams.get('type') || undefined
    const deviceId = getDeviceId()
    const items = await withDb(async (db) => {
      const col = db.collection('events')
      const q: any = { deviceId }
      if (type) q.type = type
      return col.find(q).sort({ ts: -1 }).limit(limit).toArray()
    })
    return NextResponse.json({ ok: true, items: Array.isArray(items) ? items : [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
