"use client"

import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Clock, Droplets, MapPin, Settings, Activity, Timer } from "lucide-react"
import { FlowGauge } from "@/components/flow-gauge"
import type { Valve } from "@/components/valve-grid"
import { GlassCard } from "@/components/ui/glass-card"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ValveCardProps {
  valve: Valve
  onToggle: () => void
  onClick: () => void
  showToggle?: boolean
}

export function ValveCard({ valve, onToggle, onClick, showToggle = true }: ValveCardProps) {
  const isLockedOff = valve.status === "off"
  const isEnabled = valve.enabled !== false
  const isActive = valve.status === 'active'
  const offTitle = isLockedOff ? "Deshabilitada por sistema por problemas de hardware" : undefined

  return (
    <GlassCard 
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        (!isEnabled || isLockedOff) && "opacity-80 grayscale-[0.5]"
      )}
      title={offTitle}
    >
      {/* Active State Background Effect */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-primary/5 z-0 pointer-events-none"
        />
      )}

      <div className="relative z-10 p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-foreground tracking-tight">{valve.name}</h3>
              {isActive && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <MapPin className="w-3 h-3" />
              {valve.zone}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={isActive ? "default" : "secondary"}
              className={cn(
                "transition-colors duration-300",
                isActive ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.4)]" : "bg-white/10 text-muted-foreground hover:bg-white/20"
              )}
            >
              {isActive ? "Riego Activo" : isEnabled ? "En Espera" : "Deshabilitada"}
            </Badge>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-40 relative">
          <AnimatePresence mode="wait">
            {isEnabled && isActive ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Progress Card */}
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <Activity className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Progreso</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {((valve.runLiters ?? 0).toFixed(1))} <span className="text-muted-foreground font-normal">/ {((valve.runTargetLiters ?? 0).toFixed(1))} L</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-linear-to-r from-primary to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((valve.runLiters ?? 0) / Math.max(0.0001, (valve.runTargetLiters ?? 0))) * 100)}%` }}
                      transition={{ type: "spring", stiffness: 50, damping: 20 }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      Restante
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {(() => {
                        const lph = valve.flowLph ?? 0
                        const remaining = Math.max(0, (valve.runTargetLiters ?? 0) - (valve.runLiters ?? 0))
                        if (lph <= 0 || remaining <= 0) return '—'
                        const sec = Math.ceil(remaining / (lph / 3600))
                        const m = Math.floor(sec / 60), s = sec % 60
                        return `${m}m ${s}s`
                      })()}
                    </span>
                  </div>
                </div>

                {/* Flow Rate Mini-Gauge */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Caudal Actual</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground tabular-nums">{(valve.flowLph ?? 0).toFixed(0)}</span>
                      <span className="text-xs text-muted-foreground">L/h</span>
                    </div>
                  </div>
                  <div className="h-8 w-24">
                    {/* Simple visual bar for flow */}
                    <div className="h-full w-full flex items-end gap-0.5 opacity-50">
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-primary rounded-t-sm"
                          animate={{ 
                            height: `${Math.min(100, Math.max(10, ((valve.flowLph ?? 0) / 40) * 100 * (0.5 + Math.random() * 0.5)))}%`,
                            opacity: i < ((valve.flowLph ?? 0) / 5) ? 1 : 0.2
                          }}
                          transition={{ repeat: Infinity, duration: 0.5, repeatType: "reverse" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="inactive"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">Próximo</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {valve.schedule || "—"}
                    </p>
                    {valve.nextAtSec && valve.nextAtSec > 0 && (
                      <p className="text-[10px] text-primary mt-1">
                        {(() => {
                          const delta = Math.max(0, valve.nextAtSec * 1000 - Date.now())
                          const h = Math.floor(delta / 3600000)
                          const m = Math.floor((delta % 3600000) / 60000)
                          return `en ${h}h ${m}m`
                        })()}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs font-medium">Último</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {valve.lastActive === "-" ? "Sin registro" : valve.lastActive.split(',')[0]}
                    </p>
                    {valve.lastActive !== "-" && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {valve.lastActive.split(',')[1]?.trim() || ""}
                      </p>
                    )}
                  </div>
                </div>

                {!isEnabled && (
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200/80 text-xs flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    Válvula deshabilitada manualmente
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          {showToggle ? (
            <div className="flex items-center gap-3">
              <Switch
                checked={isEnabled}
                onCheckedChange={() => onToggle()}
                disabled={isLockedOff}
                className="data-[state=checked]:bg-primary"
                title={offTitle}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {isEnabled ? "Habilitada" : "Deshabilitada"}
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Configurar en ajustes
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="hover:bg-white/10 hover:text-primary transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Detalles
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
