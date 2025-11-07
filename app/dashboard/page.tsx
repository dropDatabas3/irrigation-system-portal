"use client"

import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from "@/components/dashboard-header"
import { ValveGrid } from "@/components/valve-grid"
import { SystemStatus } from "@/components/system-status"
import { QuickActions } from "@/components/quick-actions"
import { NextRuns } from "@/components/next-runs"
import { DashboardConfigSummary } from "@/components/dashboard-config-summary"
import { LoaderOverlay } from "@/components/loader-overlay"
import { fetchConfigDedupe, type ConfigResponse } from "@/lib/config-client"

type TankResp = { ok: boolean; currentLiters?: number; capacityLiters?: number; percent?: number }

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [animateIn, setAnimateIn] = useState(false)
  const [stageMsg, setStageMsg] = useState('Cargando configuración')
  const [configReady, setConfigReady] = useState(false)
  const [tankReady, setTankReady] = useState(false)

  function looksReady(resp: ConfigResponse | null | undefined) {
    if (!resp || !resp.ok) return false
    const valves = Array.isArray(resp.config?.valves) ? resp.config!.valves! : []
    const jobs = Array.isArray(resp.config?.jobs) ? resp.config!.jobs! : []
    const anyValveInfo = valves.length > 0
    const anyEnabled = valves.some(v => v?.enabled)
    const anyJobs = jobs.length > 0
    return anyValveInfo ? (anyEnabled || anyJobs) : anyJobs
  }

  useEffect(() => {
    let cancelled = false
    let timeout: any

    async function loadConfig() {
      setStageMsg('Cargando configuración')
      const data = await fetchConfigDedupe(true).catch(() => ({ ok: false } as any))
      if (cancelled) return
      const ready = looksReady(data)
      setConfigReady(ready)
      if (!ready) setStageMsg('Esperando datos de válvulas…')
    }

    async function loadTank() {
      setStageMsg(prev => prev.includes('configuración') ? 'Inicializando depósito…' : 'Leyendo estado del depósito…')
      let tank: TankResp = { ok: false }
      try {
        const res = await fetch('/api/tank', { cache: 'no-store' })
        tank = await res.json()
      } catch {}
      if (cancelled) return
      const tReady = !!(tank && tank.ok && Number.isFinite(tank.currentLiters))
      setTankReady(tReady)
      if (!tReady) setStageMsg('Reintentando depósito…')
    }

    ;(async () => {
      await Promise.all([loadConfig(), loadTank()])
      // If either not ready, poll lightly up to 5 times
      let attempts = 0
      while (!cancelled && attempts < 5 && (!configReady || !tankReady)) {
        attempts++
        await new Promise(r => setTimeout(r, 900))
        if (!configReady) await loadConfig()
        if (!tankReady) await loadTank()
      }
      if (!cancelled) {
        // Final check
        const all = configReady && tankReady
        if (all) {
          setStageMsg('Listo')
          setTimeout(() => { if (!cancelled) { setLoading(false); setAnimateIn(true) } }, 250)
        } else {
          setStageMsg('Continuando sin algunos datos…')
          setLoading(false); setAnimateIn(true) // degrade gracefully
        }
      }
    })()

    // Safety timeout (never block >10s)
    timeout = setTimeout(() => { if (!cancelled) setLoading(false) }, 10000)
    return () => { cancelled = true; if (timeout) clearTimeout(timeout) }
  }, [configReady, tankReady])

  return (
  <div className={`min-h-screen bg-background ${loading ? 'blur-sm saturate-75 pointer-events-none' : (animateIn ? 'animate-dashboard-in' : '')}`}>
      <DashboardHeader />

      <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* System Status Overview */}
        <SystemStatus />

        {/* Quick Actions */}
        <QuickActions />

  {/* Config summary */}
  <DashboardConfigSummary />

  {/* Tank status moved into Quick Actions panel */}

        {/* Upcoming runs */}
        <NextRuns />

  {/* Liters per day chart */}
  {/** Chart movido a Métricas */}

        {/* Valve Controls Grid */}
        <ValveGrid />
      </main>
      {loading && <LoaderOverlay message={stageMsg} />}
    </div>
  )
}
