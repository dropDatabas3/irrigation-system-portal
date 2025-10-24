"use client"

import { Button } from "@/components/ui/button"
import { Droplets, LogOut, Settings, User, BarChart3, TestTube } from "lucide-react"
import { useRouter } from "next/navigation"
import { logout } from "@/app/actions/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardHeader() {
  const router = useRouter()

  const handleLogout = async () => {
    console.log("[v0] Logout clicked")
    await logout()
  }

  const handleMetricsClick = () => {
    console.log("[v0] Metrics button clicked, navigating to /dashboard/metrics")
    router.push("/dashboard/metrics")
  }

  const handleTestBenchClick = () => {
    router.push("/dashboard/test-bench")
  }

  // Removed header Settings quick button per UX request

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">PineApple Grow</h1>
            <p className="text-xs text-muted-foreground">Panel de Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-50">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full relative z-10"
            onClick={handleMetricsClick}
          >
            <BarChart3 className="w-5 h-5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full relative z-10"
            onClick={handleTestBenchClick}
            title="Banco de pruebas"
          >
            <TestTube className="w-5 h-5" />
          </Button>

          {/* Settings quick button removed */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="rounded-full relative z-10">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
