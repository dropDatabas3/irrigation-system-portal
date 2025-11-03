'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface PlacaJob {
  at: number // epoch seconds
  valve: number
  liters: number
  done: boolean
}

interface PlacaJobsResponse {
  action: string
  currentEpoch: number
  jobsCount: number
  jobs: PlacaJob[]
}

interface ScheduledJob {
  at: number // epoch seconds
  valve: number
  liters: number
}

export default function JobsDebugPanel({ deviceId }: { deviceId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placaData, setPlacaData] = useState<PlacaJobsResponse | null>(null)
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([])

  const fetchPlacaJobs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cmd/get-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al obtener jobs de la placa')
      }
      
      const data = await res.json()
      setPlacaData(data)
      
      // También obtener los jobs programados del portal
      await fetchScheduledJobs()
    } catch (err: any) {
      console.error('[JOBS-DEBUG] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchScheduledJobs = async () => {
    try {
      const res = await fetch(`/api/scheduled-jobs?deviceId=${deviceId}`)
      if (!res.ok) throw new Error('Error al obtener jobs programados')
      const data = await res.json()
      setScheduledJobs(data.jobs || [])
    } catch (err) {
      console.error('[JOBS-DEBUG] Error obteniendo jobs programados:', err)
    }
  }

  const formatEpoch = (epoch: number) => {
    if (!epoch) return 'N/A'
    const date = new Date(epoch * 1000)
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatRelativeTime = (epoch: number, currentEpoch: number) => {
    const diffSeconds = epoch - currentEpoch
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 0) {
      return `Pasado (hace ${Math.abs(diffMinutes)} min)`
    } else if (diffDays > 0) {
      return `En ${diffDays}d ${diffHours % 24}h`
    } else if (diffHours > 0) {
      return `En ${diffHours}h ${diffMinutes % 60}min`
    } else {
      return `En ${diffMinutes} min`
    }
  }

  const compareJobs = () => {
    if (!placaData) return { matching: [], missing: [], extra: [] }

    const matching: { placa: PlacaJob; scheduled: ScheduledJob }[] = []
    const missing: ScheduledJob[] = []
    const extra: PlacaJob[] = []

    // Margen de error: 60 segundos
    const TOLERANCE = 60

    scheduledJobs.forEach((scheduled: ScheduledJob) => {
      const found = placaData.jobs.find((placa: PlacaJob) => 
        placa.valve === scheduled.valve &&
        Math.abs(placa.at - scheduled.at) <= TOLERANCE &&
        Math.abs(placa.liters - scheduled.liters) < 0.01
      )
      
      if (found) {
        matching.push({ placa: found, scheduled })
      } else {
        missing.push(scheduled)
      }
    })

    placaData.jobs.forEach((placa: PlacaJob) => {
      const found = scheduledJobs.find((scheduled: ScheduledJob) =>
        scheduled.valve === placa.valve &&
        Math.abs(scheduled.at - placa.at) <= TOLERANCE &&
        Math.abs(scheduled.liters - placa.liters) < 0.01
      )
      
      if (!found) {
        extra.push(placa)
      }
    })

    return { matching, missing, extra }
  }

  const comparison = placaData ? compareJobs() : null

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Debug: Jobs en la Placa</span>
          <Button 
            onClick={fetchPlacaJobs} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Consultar Placa
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {placaData && (
          <div className="space-y-4">
            {/* Info general */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium mb-1">Hora Placa</p>
                <p className="text-sm font-mono">{formatEpoch(placaData.currentEpoch)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 font-medium mb-1">Jobs en Placa</p>
                <p className="text-2xl font-bold text-green-900">{placaData.jobsCount}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-xs text-purple-600 font-medium mb-1">Jobs Programados</p>
                <p className="text-2xl font-bold text-purple-900">{scheduledJobs.length}</p>
              </div>
            </div>

            {/* Resumen de comparación */}
            {comparison && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      {comparison.matching.length} Correctos
                    </span>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">
                      {comparison.missing.length} Faltantes
                    </span>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">
                      {comparison.extra.length} Extra
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Jobs correctos */}
            {comparison && comparison.matching.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Jobs Correctos
                </h3>
                <div className="space-y-2">
                  {comparison.matching.map((item, idx) => (
                    <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="mr-2">V{item.placa.valve}</Badge>
                          <span className="text-sm font-medium">{item.placa.liters.toFixed(2)}L</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {formatEpoch(item.placa.at)}
                          </p>
                          <p className="text-xs font-medium text-green-700">
                            {formatRelativeTime(item.placa.at, placaData.currentEpoch)}
                          </p>
                        </div>
                      </div>
                      {item.placa.done && (
                        <Badge variant="secondary" className="mt-2">Ejecutado</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jobs faltantes */}
            {comparison && comparison.missing.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Jobs Programados pero NO en Placa
                </h3>
                <div className="space-y-2">
                  {comparison.missing.map((job, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="mr-2">V{job.valve}</Badge>
                          <span className="text-sm font-medium">{job.liters.toFixed(2)}L</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {formatEpoch(job.at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jobs extra */}
            {comparison && comparison.extra.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Jobs en Placa pero NO Programados
                </h3>
                <div className="space-y-2">
                  {comparison.extra.map((job, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="mr-2">V{job.valve}</Badge>
                          <span className="text-sm font-medium">{job.liters.toFixed(2)}L</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {formatEpoch(job.at)}
                          </p>
                          <p className="text-xs font-medium text-red-700">
                            {formatRelativeTime(job.at, placaData.currentEpoch)}
                          </p>
                        </div>
                      </div>
                      {job.done && (
                        <Badge variant="secondary" className="mt-2">Ejecutado</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Todos los jobs de la placa (raw) */}
            <details className="bg-slate-50 rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Ver todos los jobs raw ({placaData.jobs.length})
              </summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(placaData.jobs, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {!placaData && !error && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Haz clic en "Consultar Placa" para ver los jobs cargados</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
