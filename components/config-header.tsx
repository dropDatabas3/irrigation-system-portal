"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"

export function ConfigHeader() {
  const router = useRouter()

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Configuración de Válvulas</h1>
            <p className="text-xs text-muted-foreground">Personaliza cada zona de riego</p>
          </div>
        </div>

        <Button className="gradient-primary">
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </header>
  )
}
