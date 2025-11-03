import { withDb } from './db'

type PersistEvent = {
  type: 'status' | 'result' | 'lwt' | 'config-ack'
  deviceId: string
  payload: any
  ts: number
}

export async function saveEvent(evt: PersistEvent) {
  const t = evt?.type
  if (!t) return
  // Only persist essential events: irrigation results and connectivity (LWT)
  if (t !== 'result' && t !== 'lwt') return
  try {
    await withDb(async (db) => {
      const col = db.collection('events')
      
      // Para eventos 'result', verificar si ya existe un evento idéntico reciente
      // (esto evita duplicados causados por mensajes retained del broker MQTT)
      if (t === 'result' && evt.payload) {
        const recentDuplicate = await col.findOne({
          type: 'result',
          deviceId: evt.deviceId,
          'payload.valve': evt.payload.valve,
          'payload.pulses': evt.payload.pulses,
          'payload.liters': evt.payload.liters,
          'payload.durationMs': evt.payload.durationMs,
          // Buscar en las últimas 24 horas para evitar duplicados
          ts: { $gt: Date.now() - 24 * 60 * 60 * 1000 }
        })
        
        // Si ya existe un evento idéntico, no guardar duplicado
        if (recentDuplicate) {
          console.log('[PERSIST] Evento duplicado ignorado:', evt.payload)
          return
        }
      }
      
      await col.insertOne({ ...evt })

      // Update tank after successful irrigation result
      if (t === 'result' && evt.payload) {
        const used = Number(evt.payload?.liters ?? evt.payload?.deliveredLiters)
        if (Number.isFinite(used) && used > 0) {
          const tankCol = db.collection('tank')
          const deviceId = evt.deviceId
          const now = Date.now()
          // Decrement current volume but not below 0
          const doc = await tankCol.findOne({ deviceId })
          const current = Number(doc?.currentVolumeLiters) || 0
          const capacity = Number(doc?.capacityLiters) || current || 0
          const nextCurrent = Math.max(0, current - used)
          await tankCol.updateOne(
            { deviceId },
            { $set: { currentVolumeLiters: nextCurrent, capacityLiters: capacity || nextCurrent, updatedAt: now }, $setOnInsert: { createdAt: now, deviceId } },
            { upsert: true }
          )
        }
      }
    })
  } catch {
    // no-op when DB not configured
  }
}

// Record a lightweight event when a configuration is created/updated
export async function saveConfigCreatedEvent(deviceId: string, info: any) {
  try {
    await withDb(async (db) => {
      const col = db.collection('events')
      await col.insertOne({ type: 'config-created', deviceId, payload: info, ts: Date.now() })
    })
  } catch {}
}

export async function saveConfigAck(deviceId: string, payload: any) {
  try {
    await withDb(async (db) => {
      const col = db.collection('configAcks')
      // Keep only the latest ack per device (upsert)
      await col.updateOne(
        { deviceId },
        { $set: { payload, ts: Date.now() } },
        { upsert: true }
      )
    })
  } catch {}
}
