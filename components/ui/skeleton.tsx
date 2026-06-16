import { cn } from "@/lib/utils"

/**
 * Base skeleton block. A soft pulsing fill plus a brighter gradient "shimmer"
 * that sweeps left-to-right (see `animate-shimmer` in tailwind.config.ts) for a
 * polished loading effect rather than a flat box. Respects reduced-motion.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70",
        "after:absolute after:inset-0 after:content-[''] after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
        "motion-reduce:after:hidden motion-reduce:animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
