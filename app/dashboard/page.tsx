import { DashboardHeader } from "@/components/dashboard-header"
import { ValveGrid } from "@/components/valve-grid"
import { SystemStatus } from "@/components/system-status"
import { QuickActions } from "@/components/quick-actions"
import { NextRuns } from "@/components/next-runs"
import { DashboardConfigSummary } from "@/components/dashboard-config-summary"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
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
    </div>
  )
}
