import { withDb } from './db'

type PersistEvent = {
  type: 'status' | 'result' | 'lwt' | 'config-ack'
  deviceId: string
  payload: any
  ts: number
}

export async function saveEvent(evt: PersistEvent) {
  try {
    await withDb(async (db) => {
      const col = db.collection('events')
      await col.insertOne({ ...evt })
    })
  } catch {
    // no-op when DB not configured
  }
}

export async function savePostedConfig(deviceId: string, payload: any) {
  try {
    await withDb(async (db) => {
      const col = db.collection('configs')
      await col.insertOne({ deviceId, payload, ts: Date.now() })
    })
  } catch {}
}

export async function saveConfigAck(deviceId: string, payload: any) {
  try {
    await withDb(async (db) => {
      const col = db.collection('configAcks')
      await col.insertOne({ deviceId, payload, ts: Date.now() })
    })
  } catch {}
}
