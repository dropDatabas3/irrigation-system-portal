// Minimal Node global to appease TS when Node types aren't installed
declare const process: any;
import { toDeviceValve } from './valves'

export type RoutineMode = 'daily' | 'weekly' | 'interval' | 'custom'

type BuildJobsOpts = {
  valveId: 'v1' | 'v2' | 'v3'
  liters: number
  mode: RoutineMode
  tzOffsetMinutes?: number // prefer browser-provided offset; fallback to server/env when absent
  scheduleTimes?: string[] // HH:mm[] for daily/custom
  selectedDays?: number[] // 0=Sun .. 6=Sat for weekly/custom
  weeklyTime?: string // HH:mm for weekly
  intervalDays?: number
  intervalHours?: number
  startTime?: string // HH:mm for interval start
  consecutiveWaterings?: number // Number of consecutive waterings per interval
  wateringIntervalMinutes?: number // Minutes between consecutive waterings
  horizonDays?: number // how many days ahead to materialize
  anchorMs?: number // Optional anchor (creation) timestamp in ms for interval schedules to preserve phase across regenerations
}

// Get timezone offset in minutes (convention: UTC-3 => -180)
// Prefer explicit env. Fall back to server local offset if available, else Buenos Aires (-180).
function getTimezoneOffsetMinutes(): number {
  const envVal = process?.env?.TZ_OFFSET_MINUTES
  if (envVal !== undefined && envVal !== null && envVal !== '') {
    const n = Number(envVal)
    if (!Number.isNaN(n) && Number.isFinite(n) && Math.abs(n) <= 14 * 60) return n
  }
  // Node's getTimezoneOffset returns minutes behind UTC with inverted sign (e.g., UTC-3 => +180)
  try {
    const inv = new Date().getTimezoneOffset()
    if (Number.isFinite(inv)) return -inv
  } catch {}
  // Sensible default for Argentina (Buenos Aires)
  return -180
}

function hhmmToTodayMs(hhmm: string, base: Date, offsetMinutes: number) {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr), m = Number(mStr)
  // Interpretar HH:mm como hora LOCAL del usuario en la fecha base,
  // y convertir a UTC: UTC = local - offset
  // Nota: offsetMinutes sigue convención IANA: UTC-3 => -180; entonces UTC = local - (-180) = local + 180
  const localDateUtcBase = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0)
  const result = localDateUtcBase - (offsetMinutes * 60 * 1000)

  // Debug logging
  if (process.env.NODE_ENV !== 'production') {
    const localTime = `${hStr.padStart(2, '0')}:${mStr.padStart(2, '0')}`
    const utcTime = new Date(result).toISOString()
    console.log(`[SCHEDULE] ${localTime} local (offset=${offsetMinutes}) → ${utcTime} (epoch=${Math.floor(result/1000)})`)
  }
  
  return result
}

function pushJob(arr: any[], atMs: number, valveId: 'v1'|'v2'|'v3', liters: number) {
  arr.push({ at: Math.floor(atMs / 1000), valve: toDeviceValve(valveId), liters })
}

export function buildJobs(opts: BuildJobsOpts) {
  const now = new Date()
  const horizonDays = Math.max(1, Math.min(opts.horizonDays ?? 7, 30))
  const jobs: any[] = []
  const liters = opts.liters
  const offset = Number.isFinite(opts.tzOffsetMinutes as any)
    ? Number(opts.tzOffsetMinutes)
    : getTimezoneOffsetMinutes()

  if (opts.mode === 'daily') {
    const times = opts.scheduleTimes?.length ? opts.scheduleTimes : ['08:00']
    console.log(`[SCHEDULE] Daily mode: times=${JSON.stringify(times)}, horizonDays=${horizonDays}`)
    for (let d = 0; d < horizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)
      console.log(`[SCHEDULE] Day ${d}: ${day.toISOString()}`)
      for (const t of times) {
        let at = hhmmToTodayMs(t, day, offset)
        console.log(`[SCHEDULE]   Time ${t}: at=${at} (${new Date(at).toISOString()}), now=${Date.now()} (${new Date().toISOString()})`)
        if (at <= Date.now()) {
          console.log(`[SCHEDULE]   ⚠️ In the past, adding 24h`)
          at += 24 * 60 * 60 * 1000
        }
        console.log(`[SCHEDULE]   ✅ Final: ${new Date(at).toISOString()} (epoch=${Math.floor(at/1000)})`)
        pushJob(jobs, at, opts.valveId, liters)
      }
    }
  } else if (opts.mode === 'weekly') {
    const days = (opts.selectedDays?.slice() || [1,3,5]).sort()
    const t = opts.weeklyTime || '08:00'
    for (let d = 0; d < horizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)
      if (days.includes(day.getDay())) {
        let at = hhmmToTodayMs(t, day, offset)
        if (at <= Date.now()) at += 24 * 60 * 60 * 1000
        pushJob(jobs, at, opts.valveId, liters)
      }
    }
  } else if (opts.mode === 'interval') {
    const dInt = Math.max(0, opts.intervalDays ?? 0)
    const hInt = Math.max(0, opts.intervalHours ?? 0)
    const stepMs = (dInt * 24 + hInt) * 3600 * 1000
    if (stepMs <= 0) return { jobs }

    const times = (opts.scheduleTimes && opts.scheduleTimes.length > 0) ? opts.scheduleTimes.slice().sort() : null
    const consecutiveCount = Math.max(1, opts.consecutiveWaterings ?? 1)
    const wateringGapMs = Math.max(0, (opts.wateringIntervalMinutes ?? 0) * 60 * 1000)

    // Anchor logic: preserve original phase of the interval.
    // If anchorMs provided (schedule creation moment), advance it by stepMs until we reach the first future window.
    // This prevents daily re-materialization from "resetting" the interval and causing watering every day.
    const anchorMs = Number.isFinite(opts.anchorMs as any) ? Number(opts.anchorMs) : null
    const anchorDate = anchorMs ? new Date(anchorMs) : now

    function computeFirstOccurrenceStart(baseTimeStr: string) {
      // Base occurrence at anchor date with baseTimeStr
      let start = hhmmToTodayMs(baseTimeStr, anchorDate, offset)
      // If this first anchored start is still in the past relative to NOW, advance in stepMs increments
      while (start <= Date.now()) start += stepMs
      return start
    }

    if (times && dInt > 0 && consecutiveCount === 1) {
      // Every N days: on each watering day, schedule all provided times (original behavior)
      const dayMs = 24 * 3600 * 1000
      const anchorTime = opts.startTime || times[0] || '08:00'
      // Preserve phase via anchor
      let dayCursor = computeFirstOccurrenceStart(anchorTime)

      const until = Date.now() + horizonDays * dayMs
      while (dayCursor <= until && jobs.length < 100) {
        const baseDay = new Date(new Date(dayCursor).getFullYear(), new Date(dayCursor).getMonth(), new Date(dayCursor).getDate())
        for (const t of times) {
          let at = hhmmToTodayMs(t, baseDay, offset)
          if (at <= Date.now()) continue
          pushJob(jobs, at, opts.valveId, liters)
          if (jobs.length >= 100) break
        }
        dayCursor += dInt * dayMs
      }
    } else if (consecutiveCount > 1 && wateringGapMs > 0) {
      // NEW: Consecutive waterings with interval between each
      // Calculate main interval occurrences (every N days or N hours)
      let at = computeFirstOccurrenceStart(opts.startTime || '08:00')
      const until = Date.now() + horizonDays * 24 * 3600 * 1000

      while (at <= until && jobs.length < 100) {
        // For each main interval occurrence, create consecutive waterings
        for (let i = 0; i < consecutiveCount; i++) {
          const wateringTime = at + (i * wateringGapMs)
          if (wateringTime <= until && jobs.length < 100) {
            pushJob(jobs, wateringTime, opts.valveId, liters)
          }
        }
        at += stepMs
      }
    } else {
      // Fallback: single series separated by step (days+hours)
      let at = computeFirstOccurrenceStart(opts.startTime || '08:00')
      const until = Date.now() + horizonDays * 24 * 3600 * 1000
      while (at <= until && jobs.length < 100) {
        pushJob(jobs, at, opts.valveId, liters)
        at += stepMs
      }
    }
  } else if (opts.mode === 'custom') {
    const days = (opts.selectedDays?.slice() || [1,3,5]).sort()
    const times = opts.scheduleTimes?.length ? opts.scheduleTimes : ['08:00']
    for (let d = 0; d < horizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)
      if (!days.includes(day.getDay())) continue
      for (const t of times) {
        let at = hhmmToTodayMs(t, day, offset)
        if (at <= Date.now()) at += 24 * 60 * 60 * 1000
        pushJob(jobs, at, opts.valveId, liters)
      }
    }
  }

  // sort by time
  jobs.sort((a, b) => a.at - b.at)
  return { jobs }
}

// ---- Job overrides merging ----
export type MaterializedJob = { at: number; valve: number; liters: number }
export type JobOverride = {
  action: 'suppress' | 'replace'
  valve: number
  at: number // original or current at to suppress
  newAt?: number
  newLiters?: number
}

export function mergeOverrides(baseJobs: MaterializedJob[], overrides: JobOverride[]): MaterializedJob[] {
  if (!Array.isArray(baseJobs) || baseJobs.length === 0) return []
  const out: MaterializedJob[] = []
  const suppressed = new Set<string>()

  const key = (v: number, at: number) => `${v}|${at}`

  // mark suppressions and collect replacements
  const replacements: Array<{ valve: number; at: number; liters: number }> = []
  for (const o of overrides || []) {
    if (!o || typeof o !== 'object') continue
    const v = Number(o.valve)
    const at = Number(o.at)
    if (!Number.isFinite(v) || !Number.isFinite(at)) continue
    if (o.action === 'suppress') {
      suppressed.add(key(v, at))
    } else if (o.action === 'replace') {
      suppressed.add(key(v, at))
      const newAt = Number(o.newAt)
      const newLiters = Number(o.newLiters)
      if (Number.isFinite(newAt) && Number.isFinite(newLiters) && newLiters > 0) {
        replacements.push({ valve: v, at: newAt, liters: newLiters })
      }
    }
  }

  for (const j of baseJobs) {
    if (!j) continue
    if (suppressed.has(key(j.valve, j.at))) continue
    out.push({ at: j.at, valve: j.valve, liters: Number(j.liters) || 0 })
  }

  for (const r of replacements) out.push(r)

  // dedupe by (valve, at) keeping the last occurrence
  const map = new Map<string, MaterializedJob>()
  for (const j of out) map.set(key(j.valve, j.at), j)
  const merged = Array.from(map.values())
  merged.sort((a, b) => a.at - b.at)
  return merged
}
