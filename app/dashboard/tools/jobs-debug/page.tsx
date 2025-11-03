import JobsDebugPanel from '@/components/jobs-debug-panel'
import { getDeviceId } from '@/lib/mqttServer'

export const dynamic = 'force-dynamic'

export default function Page() {
  const deviceId = getDeviceId()
  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Debug de Jobs</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Consulta los jobs que tiene cargados la placa y compáralos con los jobs programados en el portal.
      </p>
      <JobsDebugPanel deviceId={deviceId} />
    </div>
  )
}
