"use client"

import { useEffect } from "react"

export default function PWARegister() {
  useEffect(() => {
    // Avoid interfering with Fast Refresh in dev; register only in production
    // ...unless explicitly enabled via NEXT_PUBLIC_ENABLE_PWA_DEV=1
    const enableDev = process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === '1'
    if (((process.env.NODE_ENV === 'production') || enableDev) && 'serviceWorker' in navigator) {
      const swUrl = '/sw.js'
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log('Service worker registered:', reg.scope)
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err)
        })
    }
  }, [])

  return null
}
