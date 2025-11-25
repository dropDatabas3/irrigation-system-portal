import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

interface GlassCardProps extends HTMLMotionProps<"div"> {
  gradient?: boolean
  hoverEffect?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, gradient, hoverEffect = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl shadow-xl",
          hoverEffect && "hover:bg-card/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300",
          gradient && "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        
        {/* Subtle shine effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.div>
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
