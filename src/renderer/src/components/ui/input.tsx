import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/50 selection:bg-foreground selection:text-background",
        "flex h-11 w-full min-w-0 rounded-xl border border-border/60 glass-vibrant px-5 py-2 text-sm font-medium",
        "shadow-cosmic transition-all duration-500 outline-none",
        "hover:border-foreground/20 hover:shadow-cosmic-lg hover:scale-[1.01]",
        "focus:border-foreground/40 focus:ring-2 focus:ring-foreground/20 focus:shadow-cosmic-lg focus:scale-[1.02] neon-glow",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
