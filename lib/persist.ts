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
