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
  // Only use AUTH_USERS_PLAINTEXT for now (array of { username, password })
  const jsonPlain = process.env.AUTH_USERS_PLAINTEXT
  if (jsonPlain) {
    try {
      const arr = JSON.parse(jsonPlain)
      if (Array.isArray(arr)) {
        return arr
          .map((u) => {
            const username = String(u.username || '')
            const password = String(u.password || '')
            if (!username || !password) return null
            // Store password in cleartext for direct compare (no hash)
            return { username, passwordHash: password }
          })
          .filter(Boolean) as User[]
      }
    } catch {}
  }
  return []
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
