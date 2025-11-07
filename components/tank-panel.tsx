"use client"

import { useEffect, useRef, useState } from 'react'
import { TankStatusCard } from '@/components/tank-status-card'

interface TankInfoPayload { currentLiters: number; capacityLiters: number; percent: number }

export function TankPanel() {
  const [open, setOpen] = useState(false)
  const [originRect, setOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [initialTankInfo, setInitialTankInfo] = useState<TankInfoPayload | null>(null)

  useEffect(() => {
    const handler = (e: any) => {
      const { originRect, tankInfo } = e.detail || {}
      if (!originRect || !tankInfo) return
      setOriginRect(originRect)
      setInitialTankInfo(tankInfo)
      setOpen(true)
    }
    window.addEventListener('tank:open', handler)
    return () => window.removeEventListener('tank:open', handler)
  }, [])

  return open && originRect ? (
    <TankModal
      originRect={originRect}
      tankInfo={initialTankInfo}
      onClose={() => setOpen(false)}
    />
  ) : null
}

function TankModal({ originRect, tankInfo, onClose }: { originRect: { x: number; y: number; width: number; height: number }; tankInfo: TankInfoPayload | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Position near the origin button but allow responsive centering logic if small screen
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(originRect.x + originRect.width / 2, window.innerWidth - 24),
    top: Math.min(originRect.y + originRect.height / 2, window.innerHeight - 24),
    transform: 'translate(-50%, -50%)',
    zIndex: 60,
    width: 'min(460px, 92vw)',
    maxHeight: '85vh'
  }

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />
      <div
        ref={ref}
        style={style}
        className={`bg-neutral-900/80 border border-teal-600/40 rounded-xl shadow-xl overflow-hidden flex flex-col ${mounted ? 'animate-modalIn' : ''}`}
      >
        <div className="px-4 pt-3 pb-2 border-b border-teal-600/30 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-teal-300">Depósito de Agua</h2>
          <button
            onClick={onClose}
            className="text-teal-300 hover:text-teal-200 px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto">
          <TankStatusCard initial={tankInfo} disableInitialFetch={!!tankInfo} />
        </div>
      </div>
    </div>
  )
}
