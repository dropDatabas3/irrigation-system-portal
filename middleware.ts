import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
  const isLoginPage = request.nextUrl.pathname === "/login"
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard")

  if (isDashboard && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
