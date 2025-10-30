"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function ConfigHeader() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    if (saving) return
    setSaving(true)
    try {
      const ev = new CustomEvent('config:save')
      window.dispatchEvent(ev)
    } finally {
      // Let the handler in the list manage actual outcome; reset after a short delay
      setTimeout(() => setSaving(false), 500)
    }
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Configuración de Válvulas</h1>
            <p className="text-xs text-muted-foreground">Configura horarios, caudales y sensores para cada zona.</p>
          </div>
        </div>

        <Button className="gradient-primary" onClick={handleSave} disabled={saving} title="Guardar configuración">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando…' : 'Guardar Cambios'}
        </Button>
      </div>
    </header>
  )
}
