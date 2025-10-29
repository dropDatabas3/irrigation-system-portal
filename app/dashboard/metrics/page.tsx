import { MetricsHeader } from "@/components/metrics-header"
import dynamic from 'next/dynamic'
import { HistoryTable } from "@/components/history-table"
import { MetricsOverview } from "@/components/metrics-overview"

// Client-only charts to reduce server memory/TTFB
const WaterUsageChart = dynamic(() => import('@/components/water-usage-chart').then(m => m.WaterUsageChart), { ssr: false })
const ValveActivityChart = dynamic(() => import('@/components/valve-activity-chart').then(m => m.ValveActivityChart), { ssr: false })
const LitersPerDayChart = dynamic(() => import('@/components/liters-per-day-chart').then(m => m.LitersPerDayChart), { ssr: false })

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MetricsHeader />

      <main className="container mx-auto p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        {/* Metrics Overview */}
        <MetricsOverview />

        {/* Daily liters chart (moved from Dashboard) */}
        <LitersPerDayChart />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <WaterUsageChart />
          <ValveActivityChart />
        </div>

        {/* History Table */}
        <HistoryTable />
      </main>
    </div>
  )
}
