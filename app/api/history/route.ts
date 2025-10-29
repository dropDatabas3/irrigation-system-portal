import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseNumber(val: string | null, def: number) {
  const n = Number(val)
  return Number.isFinite(n) ? n : def
}

function cap(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const type = (url.searchParams.get('type') || '').trim()
    const valveStr = (url.searchParams.get('valve') || '').trim()
    const q = (url.searchParams.get('q') || '').trim()
    const fromStr = url.searchParams.get('from') || ''
    const toStr = url.searchParams.get('to') || ''
    const pageParam = url.searchParams.get('page')
    const pageSizeParam = url.searchParams.get('pageSize')
    const limitParam = url.searchParams.get('limit')

    // Back-compat: if limit is provided without page/pageSize, return the most recent N
    const page = cap(parseNumber(pageParam, 1), 1, 1000000)
    const pageSize = cap(parseNumber(pageSizeParam, limitParam ? parseNumber(limitParam, 50) : 50), 1, 100)

    const filter: any = {}
    if (type && type !== 'all') filter.type = type

    const valve = Number(valveStr)
    if (Number.isFinite(valve) && valve > 0) {
      filter['payload.valve'] = valve
    }

    const range: any = {}
    if (fromStr) {
      const fromMs = new Date(fromStr).getTime()
      if (Number.isFinite(fromMs)) range.$gte = fromMs
    }
    if (toStr) {
      const toMs = new Date(toStr).getTime()
      if (Number.isFinite(toMs)) range.$lte = toMs
    }
    if (Object.keys(range).length) filter.ts = range

    if (q) {
      // Lightweight text matching on a few known fields
      const or: any[] = [
        { type: { $regex: q, $options: 'i' } },
        { 'payload.reason': { $regex: q, $options: 'i' } },
      ]
      const qNum = Number(q)
      if (Number.isFinite(qNum)) {
        or.push({ 'payload.valve': qNum })
      }
      filter.$or = or
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ ok: true, items: [], total: 0, page, pageSize })
    }
    const col = db.collection('events')

    const total = await col.countDocuments(filter)
    const items = await col
      .find(filter)
      .project({})
      .sort({ ts: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray()

    return NextResponse.json({ ok: true, items, total, page, pageSize })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}
 
