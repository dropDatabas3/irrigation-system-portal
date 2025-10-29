import { withDb } from './db'

// In-memory sampling cache for status events to reduce DB writes
const lastPersistedStatus = new Map<string, { ts: number; hash: string }>()
const STATUS_SAMPLE_INTERVAL = 60_000 // 60s
let lastCleanupTs = 0

function stableStringify(obj: any): string {
  try {
    if (!obj || typeof obj !== 'object') return String(obj)
    const keys = Object.keys(obj).sort()
    const entries = keys.map((k) => `${k}:${stableStringify(obj[k])}`)
    return `{${entries.join(',')}}`
  } catch {
    try { return JSON.stringify(obj) } catch { return String(obj) }
  }
}

function createStatusHash(payload: any): string {
  // Hash only relevant fields if known; fallback to stable stringify
  const p = payload || {}
  const relevant: any = {
    runningValve: p.runningValve,
    activeValves: p.activeValves,
    runningValves: Array.isArray(p.runningValves) ? [...p.runningValves].sort() : undefined,
    flowLph: p.flowLph,
    runLiters: p.runLiters,
    runTargetLiters: p.runTargetLiters,
  }
  return stableStringify(relevant)
}

function shouldPersistStatus(deviceId: string, payload: any): boolean {
  const now = Date.now()
  const hash = createStatusHash(payload)
  const prev = lastPersistedStatus.get(deviceId)
  if (!prev) {
    lastPersistedStatus.set(deviceId, { ts: now, hash })
    return true
  }
  if (prev.hash !== hash) {
    lastPersistedStatus.set(deviceId, { ts: now, hash })
    return true
  }
  if (now - prev.ts > STATUS_SAMPLE_INTERVAL) {
    lastPersistedStatus.set(deviceId, { ts: now, hash })
    return true
  }
  // Occasional cleanup (once per 10 minutes)
  if (now - lastCleanupTs > 600_000) {
    lastCleanupTs = now
    for (const [key, info] of Array.from(lastPersistedStatus.entries())) {
      if (now - info.ts > 86_400_000) { // 24h
        lastPersistedStatus.delete(key)
      }
    }
  }
  return false
}

type PersistEvent = {
  type: 'status' | 'result' | 'lwt' | 'config-ack'
  deviceId: string
  payload: any
  ts: number
}

export async function saveEvent(evt: PersistEvent) {
  const t = evt?.type
  if (!t) return
  // Filter status events aggressively: only persist on change or every STATUS_SAMPLE_INTERVAL
  if (t === 'status') {
    if (!shouldPersistStatus(evt.deviceId, evt.payload)) return
  }
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
