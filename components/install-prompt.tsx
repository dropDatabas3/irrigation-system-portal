"use client"

import { useEffect, useState } from "react"

// Minimal UI to surface the native PWA install prompt when available.
// Shows a small floating button "Instalar app" when the browser fires `beforeinstallprompt`.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar on mobile
      e.preventDefault?.()
      setDeferredPrompt(e as any)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  if (!visible) return null

  const onClick = async () => {
    try {
      await deferredPrompt.prompt()
      // Optionally, you can read the user's choice:
      await deferredPrompt.userChoice
    } catch (err) {
      // ignore
    } finally {
      setVisible(false)
      setDeferredPrompt(null)
    }
  }

  return (
    <button
      onClick={onClick}
      aria-label="Instalar app"
      className="fixed bottom-4 right-4 z-50 rounded-md bg-sky-600 px-3 py-2 text-white shadow hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
    >
      Instalar app
    </button>
  )
}
