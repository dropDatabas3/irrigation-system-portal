import { DashboardHeader } from "@/components/dashboard-header"
import { ValveGrid } from "@/components/valve-grid"
import { SystemStatus } from "@/components/system-status"
import { QuickActions } from "@/components/quick-actions"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* System Status Overview */}
        <SystemStatus />

        {/* Quick Actions */}
        <QuickActions />

        {/* Valve Controls Grid */}
        <ValveGrid />
      </main>
    </div>
  )
}
