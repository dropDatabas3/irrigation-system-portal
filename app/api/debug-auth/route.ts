import { getUsersFromEnv } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Only return usernames, not passwords
    const users = getUsersFromEnv().map((u: { username: string; passwordHash: string }) => ({ username: u.username }))
    return NextResponse.json({ users, envCheck: "OK" })
  } catch (error) {
    console.error("Debug auth error:", error)
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 })
  }
}