import { MetricsHeader } from "@/components/metrics-header"
import { WaterUsageChart } from "@/components/water-usage-chart"
import { ValveActivityChart } from "@/components/valve-activity-chart"
import { HistoryTable } from "@/components/history-table"
import { MetricsOverview } from "@/components/metrics-overview"
import { LitersPerDayChart } from "@/components/liters-per-day-chart"

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MetricsHeader />

      <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Metrics Overview */}
        <MetricsOverview />

        {/* Daily liters chart (moved from Dashboard) */}
        <LitersPerDayChart />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WaterUsageChart />
          <ValveActivityChart />
        </div>

        {/* History Table */}
        <HistoryTable />
      </main>
    </div>
  )
}
