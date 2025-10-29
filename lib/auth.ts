import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

type User = {
  username: string
  passwordHash: string
}

const encoder = new TextEncoder()

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
  if (!secret) {
    throw new Error('AUTH_SECRET is not set')
  }
  return encoder.encode(secret)
}


function getUsersFromEnv(): User[] {
  // Only use AUTH_USER1/AUTH_PASS1 and AUTH_USER2/AUTH_PASS2 (plain text)
  const u1 = process.env.AUTH_USER1 || ''
  const p1 = process.env.AUTH_PASS1 || ''
  const u2 = process.env.AUTH_USER2 || ''
  const p2 = process.env.AUTH_PASS2 || ''
  const users: User[] = []
  if (u1 && p1) users.push({ username: u1, passwordHash: p1 })
  if (u2 && p2) users.push({ username: u2, passwordHash: p2 })
  return users
}

export async function verifyCredentials(username: string, password: string): Promise<User | null> {
  // Only compare plain text (no hash)
  const uname = (username ?? '').trim()
  const pwd = (password ?? '')
  const users = getUsersFromEnv()
  const found = users.find((u) => u.username.trim().toLowerCase() === uname.toLowerCase())
  if (!found) return null
  // Direct compare
  return found.passwordHash === pwd ? found : null
}

export async function createSession(username: string): Promise<string> {
  const secret = getAuthSecret()
  const days = Math.max(1, Number(process.env.AUTH_SESSION_DAYS || 365))
  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret)
  return token
}

export async function verifySession(token?: string | null): Promise<{ sub: string } | null> {
  if (!token) return null
  try {
    const secret = getAuthSecret()
    const { payload } = await jwtVerify(token, secret)
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    return sub ? { sub } : null
  } catch {
    return null
  }
}

export function getAuthCookieOptions() {
  const days = Math.max(1, Number(process.env.AUTH_SESSION_DAYS || 365))
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * days,
    path: '/',
  }
}
