import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ ok: true, connected: false, reason: 'MONGODB_URI not set' })
    }
    try {
      // ping
      await db.command({ ping: 1 })
      return NextResponse.json({ ok: true, connected: true, db: db.databaseName })
    } catch (e: any) {
      return NextResponse.json({ ok: true, connected: false, error: e?.message || 'ping failed' })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, connected: false, error: e?.message || 'error' }, { status: 500 })
  }
}
