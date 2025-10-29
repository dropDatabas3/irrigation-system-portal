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
  // Preferred: AUTH_USERS as JSON array of { username, passwordHash }
  const json = process.env.AUTH_USERS
  if (json) {
    try {
      const arr = JSON.parse(json)
      if (Array.isArray(arr)) {
        return arr
          .map((u) => ({ username: String(u.username || ''), passwordHash: String(u.passwordHash || '') }))
          .filter((u) => u.username && u.passwordHash)
      }
    } catch {}
  }
  // Optional: AUTH_USERS_PLAINTEXT as JSON array of { username, password }
  const jsonPlain = process.env.AUTH_USERS_PLAINTEXT
  if (jsonPlain) {
    try {
      const arr = JSON.parse(jsonPlain)
      if (Array.isArray(arr)) {
        return arr
          .map((u) => {
            const username = String(u.username || '')
            const pwd = String(u.password || '')
            if (!username || !pwd) return null
            // Hash on the fly at startup
            const passwordHash = bcrypt.hashSync(pwd, 10)
            return { username, passwordHash }
          })
          .filter(Boolean) as User[]
      }
    } catch {}
  }
  // Fallback: USER1/USER2 pairs
  const u1 = process.env.AUTH_USER1_USERNAME
  const h1 = process.env.AUTH_USER1_PASSWORD_HASH
  const p1 = process.env.AUTH_USER1_PASSWORD
  const u2 = process.env.AUTH_USER2_USERNAME
  const h2 = process.env.AUTH_USER2_PASSWORD_HASH
  const p2 = process.env.AUTH_USER2_PASSWORD
  const out: User[] = []
  if (u1 && (h1 || p1)) out.push({ username: u1, passwordHash: h1 || bcrypt.hashSync(p1 as string, 10) })
  if (u2 && (h2 || p2)) out.push({ username: u2, passwordHash: h2 || bcrypt.hashSync(p2 as string, 10) })
  return out
}

export async function verifyCredentials(username: string, password: string): Promise<User | null> {
  const users = getUsersFromEnv()
  const found = users.find((u) => u.username.toLowerCase() === username.toLowerCase())
  if (!found) return null
  try {
    const ok = await bcrypt.compare(password, found.passwordHash)
    return ok ? found : null
  } catch {
    return null
  }
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
