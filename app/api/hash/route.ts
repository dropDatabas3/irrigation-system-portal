import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifySession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = req.cookies.get('session')?.value
  const valid = await verifySession(session)
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const password = String(body?.password || '')
    if (!password) return NextResponse.json({ ok: false, error: 'Missing password' }, { status: 400 })
    const hash = await bcrypt.hash(password, 10)
    return NextResponse.json({ ok: true, hash })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }
}
