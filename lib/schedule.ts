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
    let at = hhmmToTodayMs(opts.startTime || '08:00', now)
    if (at <= Date.now()) at += stepMs
    const until = Date.now() + horizonDays * 24 * 3600 * 1000
    while (at <= until && jobs.length < 100) {
      pushJob(jobs, at, opts.valveId, liters)
      at += stepMs
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
