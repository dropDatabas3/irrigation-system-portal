"use client"

import { useEffect, useRef, useState } from 'react'
// Use runtime require to avoid type dependency on @types/react-dom
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactDOM: any = typeof window !== 'undefined' ? require('react-dom') : null
import { TankStatusCard } from '@/components/tank-status-card'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

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
    globalThis.addEventListener('tank:open', handler)
    return () => globalThis.removeEventListener('tank:open', handler)
  }, [])

  const modalContent = (
    <AnimatePresence>
      {open && originRect && (
        <TankModal
          originRect={originRect}
          tankInfo={initialTankInfo}
          onRequestClose={() => setOpen(false)}
        />
      )}
    </AnimatePresence>
  )

  if (typeof document !== 'undefined' && ReactDOM?.createPortal) {
    return ReactDOM.createPortal(modalContent, document.body)
  }
  return null
}

function TankModal({ originRect, tankInfo, onRequestClose }: Readonly<{ originRect: { x: number; y: number; width: number; height: number }; tankInfo: TankInfoPayload | null; onRequestClose: () => void }>) {
  const ref = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose()
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [onRequestClose])

  // Calculate initial position based on originRect
  const initialBox = {
    top: originRect.y,
    left: originRect.x,
    width: originRect.width,
    height: originRect.height,
    opacity: 0,
    scale: 0.8
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onRequestClose}
      />

      {/* Modal Content */}
      <motion.div
        ref={ref}
        initial={initialBox}
        animate={{ 
          top: "50%", 
          left: "50%", 
          width: "min(460px, 92vw)", 
          height: "auto",
          x: "-50%", 
          y: "-50%",
          opacity: 1,
          scale: 1
        }}
        exit={{ 
          opacity: 0,
          scale: 0.9,
          transition: { duration: 0.2 }
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute overflow-hidden rounded-2xl shadow-2xl"
        style={{ position: 'fixed' }}
      >
        <button
          onClick={onRequestClose}
          ref={closeBtnRef}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-md border border-white/10"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
        
        <TankStatusCard initial={tankInfo} disableInitialFetch={!!tankInfo} />
      </motion.div>
    </div>
  )
}
