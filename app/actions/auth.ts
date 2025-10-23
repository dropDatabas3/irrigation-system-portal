"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function login(username: string, password: string) {
  if (username && password) {
    const cookieStore = await cookies()
    cookieStore.set("isAuthenticated", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    redirect("/dashboard")
  }

  return { success: false, error: "Credenciales inválidas" }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("isAuthenticated")
  redirect("/login")
}
