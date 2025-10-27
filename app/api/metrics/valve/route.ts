import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const valve = Number(url.searchParams.get('valve') || '0')
    if (!Number.isFinite(valve) || valve <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid valve' }, { status: 400 })
    }
    const deviceId = getDeviceId()

    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000
    const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000

    const result = await withDb(async (db) => {
      const col = db.collection('events')
      const matchBase = { deviceId, type: 'result', 'payload.valve': valve }

      const [lastRun] = await col
        .find({ ...matchBase, 'payload.liters': { $gt: 0 }, 'payload.durationMs': { $gt: 0 } })
        .project({ ts: 1, 'payload.liters': 1, 'payload.durationMs': 1 })
        .sort({ ts: -1 })
        .limit(1)
        .toArray()

      const [agg7] = await col
        .aggregate([
          { $match: { ...matchBase, ts: { $gte: sevenDaysAgo }, 'payload.liters': { $gt: 0 }, 'payload.durationMs': { $gt: 0 } } },
          { $project: { liters: { $ifNull: ['$payload.liters', 0] }, durationMs: { $ifNull: ['$payload.durationMs', 0] } } },
          { $group: { _id: null, liters: { $sum: '$liters' }, durationMs: { $sum: '$durationMs' }, runs: { $sum: 1 } } },
        ])
        .toArray()

      const [agg30] = await col
        .aggregate([
          { $match: { ...matchBase, ts: { $gte: thirtyDaysAgo }, 'payload.liters': { $gt: 0 }, 'payload.durationMs': { $gt: 0 } } },
          { $project: { liters: { $ifNull: ['$payload.liters', 0] }, durationMs: { $ifNull: ['$payload.durationMs', 0] } } },
          { $group: { _id: null, liters: { $sum: '$liters' }, durationMs: { $sum: '$durationMs' }, runs: { $sum: 1 } } },
        ])
        .toArray()

      return {
        lastRun: lastRun ? { ts: lastRun.ts, liters: lastRun.payload?.liters ?? 0, durationMs: lastRun.payload?.durationMs ?? 0 } : null,
        seven: { liters: Number(agg7?.liters || 0), durationMs: Number(agg7?.durationMs || 0), runs: Number(agg7?.runs || 0) },
        thirty: { liters: Number(agg30?.liters || 0), durationMs: Number(agg30?.durationMs || 0), runs: Number(agg30?.runs || 0) },
      }
    })

    const data = (result as any) || { lastRun: null, seven: { liters: 0, durationMs: 0, runs: 0 }, thirty: { liters: 0, durationMs: 0, runs: 0 } }
    return NextResponse.json({ ok: true, ...data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
