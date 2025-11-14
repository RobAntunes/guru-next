import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-cosmic-gradient text-background shadow-cosmic hover:shadow-cosmic-lg hover:scale-[1.05] active:scale-[0.95] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-tr before:from-white/30 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-500 tracking-wide group",
        destructive:
          "bg-gradient-to-br from-destructive to-destructive/80 text-white shadow-cosmic hover:shadow-cosmic-lg hover:scale-[1.03] active:scale-[0.97]",
        outline:
          "border-2 border-foreground/20 glass-vibrant shadow-cosmic hover:border-foreground/40 hover:shadow-cosmic-lg hover:bg-card/70 hover:text-foreground neon-glow transition-all",
        secondary:
          "glass-vibrant text-foreground shadow-cosmic hover:shadow-cosmic-lg hover:scale-[1.03] active:scale-[0.97] border border-border/50",
        ghost:
          "hover:glass-vibrant hover:text-foreground transition-all hover:shadow-cosmic",
        link: "text-primary underline-offset-4 hover:underline hover:text-accent transition-colors font-medium",
      },
      size: {
        default: "h-11 px-6 py-2 has-[>svg]:px-5",
        sm: "h-9 rounded-xl gap-1.5 px-4 has-[>svg]:px-3 text-xs",
        lg: "h-14 rounded-2xl px-10 has-[>svg]:px-8 text-base",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
