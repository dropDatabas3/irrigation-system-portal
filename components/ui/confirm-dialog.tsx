"use client"

import { ReactNode } from 'react'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
  destructive?: boolean
  loading?: boolean
}

export function ConfirmDialog({ open, title = 'Confirmar', description, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', onConfirm, onCancel, destructive, loading }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 rounded-lg border border-border bg-background shadow-xl p-6 animate-in fade-in slide-in-from-bottom">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          {destructive && <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />} {title}
        </h2>
        {description && (
          <div className="text-sm text-muted-foreground mb-4 space-y-2">
            {description}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button type="button" variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
