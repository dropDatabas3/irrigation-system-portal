import { ConfigHeader } from "@/components/config-header"
import { ValveConfigList } from "@/components/valve-config-list"

export default function ConfigPage() {
  return (
    <div className="min-h-screen bg-background">
      <ConfigHeader />

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <ValveConfigList />
      </main>
    </div>
  )
}
