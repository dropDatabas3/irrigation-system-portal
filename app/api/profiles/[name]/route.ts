import { NextRequest, NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const deviceId = getDeviceId()
    const { name: raw } = await params
    const name = decodeURIComponent(raw)
    if (!name) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 })
    const deleted = await withDb(async (db) => {
      const col = db.collection('profiles')
      const res = await col.deleteOne({ deviceId, name })
      return res?.deletedCount || 0
    })
    return NextResponse.json({ ok: true, deleted })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
