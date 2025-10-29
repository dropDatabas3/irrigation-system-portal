"use client"

import dynamic from 'next/dynamic'

// Client-only charts to reduce server memory/TTFB
const WaterUsageChart = dynamic(() => import('@/components/water-usage-chart').then(m => m.WaterUsageChart), { ssr: false })
const ValveActivityChart = dynamic(() => import('@/components/valve-activity-chart').then(m => m.ValveActivityChart), { ssr: false })
const LitersPerDayChart = dynamic(() => import('@/components/liters-per-day-chart').then(m => m.LitersPerDayChart), { ssr: false })

export function MetricsChartsClient() {
  return (
    <>
      {/* Daily liters chart (moved from Dashboard) */}
      <LitersPerDayChart />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <WaterUsageChart />
        <ValveActivityChart />
      </div>
    </>
  )
}
