"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSession, getAuthCookieOptions, verifyCredentials } from "@/lib/auth"

export async function login(username: string, password: string) {
  try {
    const user = await verifyCredentials(username, password)
    if (!user) {
      return { success: false, error: "Credenciales inválidas" }
    }
    const token = await createSession(user.username)
    const cookieStore = await cookies()
    cookieStore.set("session", token, getAuthCookieOptions())
    // Cleanup legacy cookie if present
    cookieStore.delete("isAuthenticated")
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: `Error interno: ${errorMessage}` }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
  redirect("/login")
}
