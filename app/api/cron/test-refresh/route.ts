import { NextResponse } from 'next/server'

/**
 * Endpoint de prueba que redirige al cron job real
 * No requiere autenticación para facilitar testing
 */
export async function GET() {
  try {
    // Llamar al endpoint real del cron internamente
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/cron/refresh-jobs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
      },
    })
    
    const data = await response.json()
    
    return NextResponse.json({
      ...data,
      test: true,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Test failed',
      test: true,
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
