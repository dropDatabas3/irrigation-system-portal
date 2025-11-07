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

function isLikelyFallback(resp: ConfigResponse | null | undefined) {
  if (!resp || !resp.ok) return true
  const cfg = resp.config
  const valves = Array.isArray(cfg?.valves) ? cfg!.valves! : []
  const jobs = Array.isArray(cfg?.jobs) ? cfg!.jobs! : []
  // Heurística: 4 válvulas sin metadata y todas deshabilitadas + 0 jobs => probablemente fallback
  const looksAllDisabled = valves.length === 4 && valves.every(v => (v?.enabled === false || !('enabled' in v)) && !v?.name && !v?.zone)
  if (looksAllDisabled && jobs.length === 0) return true
  return false
}

export async function fetchConfigDedupe(force = false): Promise<ConfigResponse> {
  if (!force && last && Date.now() - last.ts < TTL_MS) {
    if (!isLikelyFallback(last.data)) {
      console.log('[fetchConfigDedupe] returning cached response')
      return last.data
    }
    // Si el cache luce fallback, ignoramos cache y seguimos a una refetch inmediata
    console.log('[fetchConfigDedupe] cached response looks fallback, refetching...')
  }
  if (inflight) {
    console.log('[fetchConfigDedupe] returning inflight promise')
    return inflight
  }
  console.log('[fetchConfigDedupe] starting new fetch...')
  inflight = (async () => {
    const tryFetch = async (): Promise<ConfigResponse> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        const res = await fetch('/api/config', {
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'x-tz-offset-minutes': String(-new Date().getTimezoneOffset()) },
        })
        clearTimeout(timeoutId)
        const json = (await res.json()) as ConfigResponse
        return json
      } catch (e) {
        clearTimeout(timeoutId)
        console.error('[fetchConfigDedupe] fetch error:', e)
        return { ok: false }
      }
    }

    // Hasta 3 intentos si parece fallback, con backoff suave
    let attempt = 0
    let data: ConfigResponse = { ok: false }
    while (attempt < 3) {
      attempt++
      data = await tryFetch()
      if (!isLikelyFallback(data)) break
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 700 * attempt))
      }
    }

    console.log('[fetchConfigDedupe] fetched (attempt', attempt, '), cached for', TTL_MS, 'ms')
    last = { ts: Date.now(), data }
    inflight = null
    return data
  })()
  return inflight
}
