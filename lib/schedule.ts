import { toDeviceValve } from './valves'

export type RoutineMode = 'daily' | 'weekly' | 'interval' | 'custom'

type BuildJobsOpts = {
  valveId: 'v1' | 'v2' | 'v3'
  liters: number
  mode: RoutineMode
  scheduleTimes?: string[] // HH:mm[] for daily/custom
  selectedDays?: number[] // 0=Sun .. 6=Sat for weekly/custom
  weeklyTime?: string // HH:mm for weekly
  intervalDays?: number
  intervalHours?: number
  startTime?: string // HH:mm for interval start
  consecutiveWaterings?: number // Number of consecutive waterings per interval
  wateringIntervalMinutes?: number // Minutes between consecutive waterings
  horizonDays?: number // how many days ahead to materialize
}

function hhmmToTodayMs(hhmm: string, base: Date) {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr), m = Number(mStr)
  const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0)
  return dt.getTime()
}

function pushJob(arr: any[], atMs: number, valveId: 'v1'|'v2'|'v3', liters: number) {
  arr.push({ at: Math.floor(atMs / 1000), valve: toDeviceValve(valveId), liters })
}

export function buildJobs(opts: BuildJobsOpts) {
  const now = new Date()
  const horizonDays = Math.max(1, Math.min(opts.horizonDays ?? 7, 30))
  const jobs: any[] = []
  const liters = opts.liters

  if (opts.mode === 'daily') {
    const times = opts.scheduleTimes?.length ? opts.scheduleTimes : ['08:00']
    for (let d = 0; d < horizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)
      for (const t of times) {
        let at = hhmmToTodayMs(t, day)
        if (at <= Date.now()) at += 24 * 60 * 60 * 1000
        pushJob(jobs, at, opts.valveId, liters)
      }
    }
  } else if (opts.mode === 'weekly') {
    const days = (opts.selectedDays?.slice() || [1,3,5]).sort()
    const t = opts.weeklyTime || '08:00'
    for (let d = 0; d < horizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)
      if (days.includes(day.getDay())) {
        let at = hhmmToTodayMs(t, day)
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

    if (times && dInt > 0 && consecutiveCount === 1) {
      // Every N days: on each watering day, schedule all provided times (original behavior)
      const dayMs = 24 * 3600 * 1000
      const anchorTime = opts.startTime || times[0] || '08:00'
      let dayCursor = hhmmToTodayMs(anchorTime, now)
      while (dayCursor <= Date.now()) dayCursor += dInt * dayMs

      const until = Date.now() + horizonDays * dayMs
      while (dayCursor <= until && jobs.length < 100) {
        const baseDay = new Date(new Date(dayCursor).getFullYear(), new Date(dayCursor).getMonth(), new Date(dayCursor).getDate())
        for (const t of times) {
          let at = hhmmToTodayMs(t, baseDay)
          if (at <= Date.now()) continue
          pushJob(jobs, at, opts.valveId, liters)
          if (jobs.length >= 100) break
        }
        dayCursor += dInt * dayMs
      }
    } else if (consecutiveCount > 1 && wateringGapMs > 0) {
      // NEW: Consecutive waterings with interval between each
      // Calculate main interval occurrences (every N days or N hours)
      let at = hhmmToTodayMs(opts.startTime || '08:00', now)
      if (at <= Date.now()) at += stepMs
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
      let at = hhmmToTodayMs(opts.startTime || '08:00', now)
      if (at <= Date.now()) at += stepMs
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
        let at = hhmmToTodayMs(t, day)
        if (at <= Date.now()) at += 24 * 60 * 60 * 1000
        pushJob(jobs, at, opts.valveId, liters)
      }
    }
  }

  // sort by time
  jobs.sort((a, b) => a.at - b.at)
  return { jobs }
}
