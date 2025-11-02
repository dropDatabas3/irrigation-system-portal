import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const valveParam = url.searchParams.get('valve')
    const valve = valveParam ? Number(valveParam) : undefined

    const deviceId = getDeviceId()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const result = await withDb(async (db) => {
      const col = db.collection('events')

      // Base filter for all queries - check either deliveredLiters OR liters exists
      const baseFilter: any = { 
        deviceId, 
        type: 'result',
        $or: [
          { 'payload.deliveredLiters': { $exists: true, $gt: 0 } },
          { 'payload.liters': { $exists: true, $gt: 0 } }
        ]
      }
      
      // Add valve filter if specified
      if (Number.isFinite(valve) && valve! > 0) {
        baseFilter['payload.valve'] = valve
      }

      const [monthAgg] = await col
        .aggregate([
          { $match: { ...baseFilter, ts: { $gte: monthStart } } },
          { 
            $project: { 
              liters: { $ifNull: ['$payload.deliveredLiters', { $ifNull: ['$payload.liters', 0] }] }, 
              durationMs: { $ifNull: ['$payload.durationMs', 0] } 
            } 
          },
          { $group: { _id: null, liters: { $sum: '$liters' }, durationMs: { $sum: '$durationMs' } } },
        ])
        .toArray()

      const [sevenAgg] = await col
        .aggregate([
          { $match: { ...baseFilter, ts: { $gte: sevenDaysAgo } } },
          { $project: { liters: { $ifNull: ['$payload.deliveredLiters', { $ifNull: ['$payload.liters', 0] }] } } },
          { $group: { _id: null, liters: { $sum: '$liters' } } },
        ])
        .toArray()

      const [thirtyAgg] = await col
        .aggregate([
          { $match: { ...baseFilter, ts: { $gte: thirtyDaysAgo } } },
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

    return NextResponse.json({ 
      ok: true, 
      totalMonthLiters, 
      avgDayLiters, 
      totalActiveHours,
      valve: valve || null 
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
