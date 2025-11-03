"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function ConfigHeader() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Listen for dirty state from the list
  useEffect(() => {
    const onDirty = (e: Event) => {
      const ce = e as CustomEvent
      const val = !!(ce?.detail as any)
      setDirty(val)
    }
    window.addEventListener('config:dirty', onDirty as EventListener)
    return () => window.removeEventListener('config:dirty', onDirty as EventListener)
  }, [])

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
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 md:h-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-foreground truncate">Configuración</h1>
            <p className="text-xs text-muted-foreground hidden md:block">Configura horarios, caudales y sensores para cada zona.</p>
          </div>
        </div>

        <Button className="gradient-primary shrink-0" onClick={handleSave} disabled={saving || !dirty} title="Guardar configuración">
          <Save className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">{saving ? 'Guardando…' : (dirty ? 'Guardar Cambios' : 'Sin cambios')}</span>
        </Button>
      </div>
    </header>
  )
}
