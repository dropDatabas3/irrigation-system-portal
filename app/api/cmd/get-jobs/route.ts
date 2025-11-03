import { NextRequest, NextResponse } from 'next/server'
import { ensureConnected, publishCmd, getDeviceId } from '@/lib/mqttServer'
import { eventBus } from '@/lib/eventBus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { deviceId: bodyDeviceId } = await req.json()
    const deviceId = bodyDeviceId || getDeviceId()

    ensureConnected()

    // Esperar una sola respuesta de status con action "get-jobs"
    const response = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        off()
        reject(new Error('Timeout esperando respuesta de la placa'))
      }, 10000)

      const off = eventBus.onEvent((evt) => {
        if (evt.type === 'status' && evt?.payload?.action === 'get-jobs') {
          clearTimeout(timeout)
          off()
          resolve(evt.payload)
        }
      })

      publishCmd({ action: 'get-jobs' } as any, deviceId).catch((err) => {
        clearTimeout(timeout)
        off()
        reject(err)
      })
    })

    return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 })
  }
}
