import { NextResponse } from 'next/server'
import { withDb } from '@/lib/db'
import { publishConfig, getDeviceId, ensureConnected } from '@/lib/mqttServer'

export const runtime = 'nodejs'

// Simple horizon extender: ensures jobs exist for next 7 days by copying past-day jobs +7d ahead if missing
export async function POST() {
  try {
    const deviceId = getDeviceId()
    // Load last posted config (jobs array)
    const last = await withDb(async (db) => {
      const col = db.collection('configs')
      const doc = await col.find({ deviceId }).sort({ ts: -1 }).limit(1).next()
      return doc?.payload
    })
    const nowSec = Math.floor(Date.now() / 1000)
    const horizonSec = nowSec + 7 * 24 * 3600
    const jobs: any[] = Array.isArray(last?.jobs) ? last.jobs.slice() : []
    if (!jobs.length) return NextResponse.json({ ok: false, reason: 'no-jobs' })

    // Keep only future jobs within 14 days to avoid growth
    const future = jobs.filter(j => typeof j?.at === 'number' && j.at >= nowSec && j.at <= (nowSec + 14*24*3600))
    const haveTimes = new Set(future.map(j => `${j.valve}-${j.at}`))

    // For jobs in the last 48h, propose a +7d copy if within horizon and not already present
    const past = jobs.filter(j => typeof j?.at === 'number' && j.at < nowSec && j.at >= (nowSec - 2*24*3600))
    for (const j of past) {
      const at2 = j.at + 7 * 24 * 3600
      if (at2 <= horizonSec) {
        const key = `${j.valve}-${at2}`
        if (!haveTimes.has(key)) {
          future.push({ valve: j.valve, liters: j.liters, at: at2 })
          haveTimes.add(key)
        }
      }
    }

    // If after this we still lack horizon coverage, also project any remaining future job that is < 24h ahead by +7d
    const withinDay = future.filter(j => j.at <= nowSec + 24*3600)
    for (const j of withinDay) {
      const at2 = j.at + 7 * 24 * 3600
      if (at2 <= horizonSec) {
        const key = `${j.valve}-${at2}`
        if (!haveTimes.has(key)) {
          future.push({ valve: j.valve, liters: j.liters, at: at2 })
          haveTimes.add(key)
        }
      }
    }

    future.sort((a,b) => a.at - b.at)
    ensureConnected()
    await publishConfig({ jobs: future, serverTimeSec: nowSec }, deviceId)
    return NextResponse.json({ ok: true, jobs: future.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET() { return POST() }
