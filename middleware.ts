import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value
  const isValid = await verifySession(session)
  const isLoginPage = request.nextUrl.pathname === "/login"
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard")

  if (isDashboard && !isValid) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isLoginPage && isValid) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
