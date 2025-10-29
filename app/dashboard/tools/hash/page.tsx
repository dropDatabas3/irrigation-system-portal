"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function HashToolPage() {
  const [password, setPassword] = useState('')
  const [hash, setHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onGenerate() {
    setLoading(true)
    setError(null)
    setHash(null)
    try {
      const res = await fetch('/api/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json?.ok) setHash(json.hash)
      else setError(json?.error || 'Error')
    } catch (e) {
      setError('Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-xl gradient-border">
        <CardHeader>
          <CardTitle>Generar hash de contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Input type="password" placeholder="Nueva contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={onGenerate} disabled={loading || !password}>Generar</Button>
          {hash && (
            <div className="text-xs break-all p-2 rounded border border-border bg-secondary/30">{hash}</div>
          )}
          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}
          <div className="text-xs text-muted-foreground">Pegá este hash en .env.local (AUTH_USERS o AUTH_USER*_PASSWORD_HASH).</div>
        </CardContent>
      </Card>
    </div>
  )
}
