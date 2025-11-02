import { MetricsHeader } from "@/components/metrics-header"
import { HistoryTable } from "@/components/history-table"
import { MetricsOverview } from "@/components/metrics-overview"
import { MetricsChartsClient } from "@/components/metrics-charts.client"
import { MetricsFilterProvider } from "@/lib/metrics-filter-context"

export default function MetricsPage() {
  return (
    <MetricsFilterProvider>
      <div className="min-h-screen bg-background">
        <MetricsHeader />

        <main className="container mx-auto p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6">
          {/* Global Filters + Metrics Overview */}
          <MetricsOverview />

          <MetricsChartsClient />

          {/* History Table */}
          <HistoryTable />
        </main>
      </div>
    </MetricsFilterProvider>
  )
}
