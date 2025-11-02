import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { getDeviceId } from '@/lib/mqttServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const deviceId = getDeviceId()

    const valves = await withDb(async (db) => {
      const col = db.collection('events')
      
      // Get distinct valves that have irrigation data
      const result = await col.aggregate([
        {
          $match: {
            deviceId,
            type: 'result',
            $or: [
              { 'payload.deliveredLiters': { $exists: true, $gt: 0 } },
              { 'payload.liters': { $exists: true, $gt: 0 } }
            ],
            'payload.valve': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$payload.valve',
            count: { $sum: 1 },
            lastEvent: { $max: '$ts' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray()

      return result.map((v: any) => ({
        id: v._id,
        eventCount: v.count,
        lastEvent: v.lastEvent
      }))
    })

    return NextResponse.json({ ok: true, valves })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
