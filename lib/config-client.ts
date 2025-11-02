// Client-side shared fetch with deduping/TTL for /api/config
// Avoids multiple components hammering the same endpoint at mount time.

export interface ConfigResponse {
  ok: boolean
  config?: {
    valves?: Array<{ id: number; enabled?: boolean; name?: string; zone?: string; schedule?: any }>
    jobs?: Array<{ at: number; valve: number; liters?: number }>
  }
  ts?: number
}

let inflight: Promise<ConfigResponse> | null = null
let last: { ts: number; data: ConfigResponse } | null = null
const TTL_MS = 3000 // keep a short cache to survive initial mount thrash
const FETCH_TIMEOUT_MS = 5000 // max 5s wait for /api/config

export async function fetchConfigDedupe(force = false): Promise<ConfigResponse> {
  if (!force && last && Date.now() - last.ts < TTL_MS) {
    console.log('[fetchConfigDedupe] returning cached response')
    return last.data
  }
  if (inflight) {
    console.log('[fetchConfigDedupe] returning inflight promise')
    return inflight
  }
  console.log('[fetchConfigDedupe] starting new fetch...')
  inflight = (async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch('/api/config', { 
        cache: 'no-store',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      const json = (await res.json()) as ConfigResponse
      console.log('[fetchConfigDedupe] success, cached for', TTL_MS, 'ms')
      last = { ts: Date.now(), data: json }
      return json
    } catch (e) {
      clearTimeout(timeoutId)
      console.error('[fetchConfigDedupe] failed:', e)
      const fallback: ConfigResponse = { ok: false }
      last = { ts: Date.now(), data: fallback }
      return fallback
    } finally {
      inflight = null
    }
  })()
  return inflight
}
