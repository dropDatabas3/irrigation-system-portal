"use client"

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TankStatusCard } from '@/components/tank-status-card'

export function TankPanel() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('tank:open', handler)
    return () => window.removeEventListener('tank:open', handler)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-5">
        <SheetHeader>
          <SheetTitle>Depósito de Agua</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <TankStatusCard />
        </div>
      </SheetContent>
    </Sheet>
  )
}
