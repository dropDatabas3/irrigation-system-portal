import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseDateParam(p?: string | null): number | null {
  if (!p) return null
  // try epoch seconds or ms
  const n = Number(p)
  if (Number.isFinite(n) && n > 0) {
    return n > 1e12 ? n : n * 1000
  }
  // try ISO
  const d = new Date(p)
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const startMs = parseDateParam(url.searchParams.get('start'))
    const endMs = parseDateParam(url.searchParams.get('end'))
    const valveParam = url.searchParams.get('valve')
    const valve = valveParam ? Number(valveParam) : undefined

    const now = Date.now()
    const defaultStart = now - 30 * 24 * 3600 * 1000
    const s = Math.floor((startMs ?? defaultStart) / 1000)
    const e = Math.floor((endMs ?? now) / 1000)

    const deviceId = getDeviceId()
    const items = await withDb(async (db) => {
      const col = db.collection('events')
  const match: any = { deviceId, type: 'result', ts: { $gte: s * 1000, $lt: e * 1000 }, 'payload.liters': { $gt: 0 } }
      if (Number.isFinite(valve)) match['payload.valve'] = valve
      const pipeline = [
        { $match: match },
        {
          $project: {
            day: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$ts' } } },
            liters: { $ifNull: ['$payload.liters', 0] },
          },
        },
        { $group: { _id: '$day', liters: { $sum: '$liters' }, runs: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ] as any
      return col.aggregate(pipeline).toArray()
    })

    const series = Array.isArray(items)
      ? items.map((x: any) => ({ day: x._id, liters: x.liters, runs: x.runs }))
      : []

    return NextResponse.json({ ok: true, series, start: s, end: e })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
