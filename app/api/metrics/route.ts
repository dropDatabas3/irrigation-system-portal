import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const deviceId = getDeviceId()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const result = await withDb(async (db) => {
      const col = db.collection('events')

      const [monthAgg] = await col
        .aggregate([
          { $match: { deviceId, type: 'result', ts: { $gte: monthStart }, 'payload.liters': { $gt: 0 } } },
          { $project: { liters: { $ifNull: ['$payload.liters', 0] }, durationMs: { $ifNull: ['$payload.durationMs', 0] } } },
          { $group: { _id: null, liters: { $sum: '$liters' }, durationMs: { $sum: '$durationMs' } } },
        ])
        .toArray()

      const [sevenAgg] = await col
        .aggregate([
          { $match: { deviceId, type: 'result', ts: { $gte: sevenDaysAgo }, 'payload.liters': { $gt: 0 } } },
          { $project: { liters: { $ifNull: ['$payload.liters', 0] } } },
          { $group: { _id: null, liters: { $sum: '$liters' } } },
        ])
        .toArray()

      const [thirtyAgg] = await col
        .aggregate([
          { $match: { deviceId, type: 'result', ts: { $gte: thirtyDaysAgo }, 'payload.durationMs': { $gt: 0 } } },
          { $project: { durationMs: { $ifNull: ['$payload.durationMs', 0] } } },
          { $group: { _id: null, durationMs: { $sum: '$durationMs' } } },
        ])
        .toArray()

      return {
        totals: {
          monthLiters: Number(monthAgg?.liters || 0),
          sevenDayLiters: Number(sevenAgg?.liters || 0),
          thirtyDayDurationMs: Number(thirtyAgg?.durationMs || 0),
        },
      }
    })

    const totals = (result as any)?.totals || { monthLiters: 0, sevenDayLiters: 0, thirtyDayDurationMs: 0 }
    const totalMonthLiters = Number((totals.monthLiters || 0).toFixed(2))
    const avgDayLiters = Number(((totals.sevenDayLiters || 0) / 7).toFixed(2))
    const totalActiveHours = Number(((totals.thirtyDayDurationMs || 0) / 3600000).toFixed(2))

    return NextResponse.json({ ok: true, totalMonthLiters, avgDayLiters, totalActiveHours })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
