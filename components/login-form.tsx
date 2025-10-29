"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Droplets, Lock, User } from "lucide-react"
import { login } from "@/app/actions/auth"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string


    try {
      const res = await login(username, password)
      if ((res as any)?.success === false) {
        setError((res as any)?.error || 'Credenciales inválidas')
        setIsLoading(false)
      }
    } catch (err) {
      setError("Error al iniciar sesión: " + (err as any)?.message)
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md relative gradient-border">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
          <Droplets className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-balance">PinneApple Grow</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Ingresa tus credenciales para acceder al portal
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
      <div className="z-10">
        <form onSubmit={handleSubmit} className="space-y-4 z-10">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">
              Usuario
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Ingresa tu usuario"
                className="pl-10 bg-secondary/50 border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                className="pl-10 bg-secondary/50 border-border"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground font-semibold"
            disabled={isLoading}
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
        </div>
      </CardContent>
    </Card>
  )
}
