"use client"

import { useEffect, useRef, useState } from 'react'
// Use runtime require to avoid type dependency on @types/react-dom
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactDOM: any = typeof window !== 'undefined' ? require('react-dom') : null
import { TankStatusCard } from '@/components/tank-status-card'

interface TankInfoPayload { currentLiters: number; capacityLiters: number; percent: number }

export function TankPanel() {
  const [open, setOpen] = useState(false)
  const [originRect, setOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [initialTankInfo, setInitialTankInfo] = useState<TankInfoPayload | null>(null)
  const [closing, setClosing] = useState(false)

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
      onRequestClose={() => {
        setClosing(true)
        // Let animation finish before unmount
        setTimeout(() => { setOpen(false); setClosing(false) }, 280)
      }}
      closing={closing}
    />
  ) : null
}

function TankModal({ originRect, tankInfo, onRequestClose, closing }: { originRect: { x: number; y: number; width: number; height: number }; tankInfo: TankInfoPayload | null; onRequestClose: () => void; closing: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose()
      // Focus trap
      if (e.key === 'Tab' && ref.current) {
        const focusables = Array.from(ref.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.hasAttribute('disabled'))
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement
        if (e.shiftKey) {
          if (active === first || !ref.current.contains(active)) {
            e.preventDefault(); last.focus()
          }
        } else {
          if (active === last || !ref.current.contains(active)) {
            e.preventDefault(); first.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    // Set initial focus to close button
    setTimeout(() => closeBtnRef.current?.focus(), 0)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRequestClose])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onRequestClose()
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [onRequestClose])

  // Animate from origin center → viewport center using CSS variables for offsets
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const originCenterX = originRect.x + originRect.width / 2
  const originCenterY = originRect.y + originRect.height / 2
  const dx = originCenterX - centerX
  const dy = originCenterY - centerY

  const style: React.CSSProperties = {
    position: 'fixed',
    left: '50vw',
    top: '50vh',
    transform: 'translate(-50%, -50%)',
    zIndex: 60,
    width: 'min(460px, 92vw)',
    maxHeight: '85vh',
    // Provide offsets for animation
    ['--from-x' as any]: `${dx}px`,
    ['--from-y' as any]: `${dy}px`,
  }

  const modalTree = (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Backdrop: mismo enfoque que el loader */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`} aria-hidden />
      <div
        ref={ref}
        style={style}
        className={`relative overflow-visible ${mounted ? (closing ? 'animate-to-origin' : 'animate-from-origin') : ''}`}
      >
        {/* Close button inside modal bounds */}
        <button
          onClick={onRequestClose}
          ref={closeBtnRef}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/70 shadow-lg ring-1 ring-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
          aria-label="Cerrar"
        >
          ×
        </button>
        {/* Only the status card */}
        <TankStatusCard initial={tankInfo} disableInitialFetch={!!tankInfo} />
      </div>
    </div>
  )

  // Portal al body para evitar stacking contexts/filters que rompan el blur
  if (typeof document !== 'undefined' && ReactDOM?.createPortal) return ReactDOM.createPortal(modalTree, document.body)
  return modalTree
}
