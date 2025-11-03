import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/db'
import { buildJobs } from '../../../lib/schedule'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('deviceId')
    
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId requerido' }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const col = db.collection('config')
    const doc = await col.findOne({ deviceId })
    
    if (!doc || !doc.valves) {
      return NextResponse.json({ jobs: [] })
    }

    const now = Math.floor(Date.now() / 1000)
    const allJobs: Array<{ at: number; valve: number; liters: number }> = []

    // Reconstruir jobs desde la configuración actual
    for (const valve of doc.valves) {
      if (!valve.enabled) continue
      const sch = valve.schedule

      if (!sch || !sch.enabled) continue

      const common = {
        valveId: valve.id,
        liters: valve.liters || 0,
        horizonDays: 7,
      }

      let result: { jobs: any[] } = { jobs: [] }

      if (sch.mode === 'daily' && Array.isArray(sch.times)) {
        result = buildJobs({ 
          ...common, 
          mode: 'daily', 
          scheduleTimes: sch.times 
        } as any)
      } else if (sch.mode === 'weekly' && Array.isArray(sch.days) && sch.startTime) {
        result = buildJobs({ 
          ...common, 
          mode: 'weekly', 
          selectedDays: sch.days, 
          weeklyTime: sch.startTime 
        } as any)
      } else if (sch.mode === 'interval' && sch.intervalHours && typeof sch.intervalHours === 'number') {
        result = buildJobs({ 
          ...common, 
          mode: 'interval', 
          intervalHours: sch.intervalHours, 
          startTime: sch.startTime || '00:00' 
        } as any)
      } else if (sch.mode === 'custom' && Array.isArray(sch.days) && Array.isArray(sch.times)) {
        result = buildJobs({ 
          ...common, 
          mode: 'custom', 
          selectedDays: sch.days, 
          scheduleTimes: sch.times 
        } as any)
      }

      allJobs.push(...result.jobs)
    }

    // Ordenar por timestamp
    allJobs.sort((a, b) => a.at - b.at)

    // Filtrar solo futuros
    const futureJobs = allJobs.filter(j => j.at > now)

    console.log('[SCHEDULED-JOBS] deviceId:', deviceId, 'jobs:', futureJobs.length)

    return NextResponse.json({ jobs: futureJobs })
  } catch (error: any) {
    console.error('[SCHEDULED-JOBS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener jobs programados' },
      { status: 500 }
    )
  }
}
