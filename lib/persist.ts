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
