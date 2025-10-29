// Simple MongoDB connection helper using the official driver
// Works as a singleton across hot reloads in Next.js dev

import { MongoClient, Db } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

function getMongoUri() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proc: any = typeof process !== 'undefined' ? process : (globalThis as any)
  const uri = proc?.env?.MONGODB_URI as string | undefined
  return uri || ''
}

function getDbName() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proc: any = typeof process !== 'undefined' ? process : (globalThis as any)
  return (proc?.env?.MONGODB_DB || proc?.env?.DB_NAME || 'irrigation') as string
}

export async function getDb(): Promise<Db | null> {
  if (db) return db
  const uri = getMongoUri()
  if (!uri) return null
  if (!client) {
    client = new MongoClient(uri, { maxPoolSize: 5 })
    await client.connect()
  }
  db = client.db(getDbName())
  try {
    // Ensure helpful indexes for performance; safe to call repeatedly
    await db.collection('events').createIndexes([
      { key: { deviceId: 1, type: 1, ts: -1 }, name: 'byDeviceTypeTs' },
      { key: { ts: -1 }, name: 'byTs' },
    ])
    // One doc per valve per device
    try { await db.collection('configs').dropIndex('byDeviceTs') } catch {}
    await db.collection('configs').createIndex({ deviceId: 1, valveId: 1 }, { name: 'byDeviceValve', unique: true })
    // Keep only latest ack per device
    try { await db.collection('configAcks').dropIndex('byDeviceTs') } catch {}
    await db.collection('configAcks').createIndex({ deviceId: 1 }, { name: 'byDeviceUnique', unique: true })
  } catch {
    // ignore index errors in dev or when no permissions
  }
  return db
}

export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T | null> {
  const d = await getDb()
  if (!d) return null
  return fn(d)
}
