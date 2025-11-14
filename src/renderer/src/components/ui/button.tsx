import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary via-accent to-primary text-primary-foreground shadow-luxury hover:shadow-luxury-lg hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        destructive:
          "bg-destructive text-destructive-foreground shadow-luxury hover:bg-destructive/90 hover:shadow-luxury-lg hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-border/50 bg-card/30 backdrop-blur-sm shadow-luxury hover:bg-card/50 hover:border-primary/30 hover:shadow-luxury-lg hover:text-foreground transition-all",
        secondary:
          "bg-secondary/80 backdrop-blur-sm text-secondary-foreground shadow-luxury hover:bg-secondary hover:shadow-luxury-lg hover:scale-[1.02] active:scale-[0.98]",
        ghost:
          "hover:bg-muted/50 hover:text-foreground transition-colors",
        link: "text-primary underline-offset-4 hover:underline hover:text-accent transition-colors",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded-lg",
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
