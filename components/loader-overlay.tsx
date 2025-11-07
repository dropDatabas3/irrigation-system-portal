"use client"

import React from "react"

type LoaderOverlayProps = {
  message?: string
}

export function LoaderOverlay({
  message = "Cargando información",
}: LoaderOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-50 flex flex-col items-center gap-6 px-6">
        {/* Loader agua 3D */}
        <div className="loader-water-3d select-none w-40 h-40 sm:w-52 sm:h-52">
          <div className="loader-water-glow" />
          <div className="loader-water-shell">
            <div className="loader-water-orbit loader-water-orbit-front" />
            <div className="loader-water-orbit loader-water-orbit-back" />
            <div className="loader-water-core" />
            <div className="loader-water-specular" />
          </div>
        </div>

        {/* Texto */}
        <div className="text-center">
          <p className="text-lg font-medium text-foreground/90">
            {message}
            <span className="loader-dots" aria-hidden="true" />
          </p>
          <p className="mt-1 text-xs text-foreground/60">
            Preparando panel y próximas ejecuciones…
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoaderOverlay
