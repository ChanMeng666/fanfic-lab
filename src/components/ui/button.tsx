import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        // Primary - Deep Teal with lift on hover
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm",
        // AI Action - Warm Amber with glow
        ai: "bg-gradient-ai text-accent-foreground shadow-sm ai-glow hover:ai-glow-strong hover:-translate-y-0.5 active:translate-y-0",
        // Destructive
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        // Outline - Subtle border
        outline:
          "border border-border bg-background shadow-xs hover:bg-secondary hover:border-border-strong hover:text-foreground dark:bg-surface dark:hover:bg-secondary",
        // Secondary - Soft sage
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Ghost - Minimal
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // AI Ghost - For AI toolbar buttons
        "ai-ghost":
          "text-muted-foreground hover:bg-accent-subtle hover:text-accent-foreground border border-transparent hover:border-accent/30",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-lg px-8 text-base has-[>svg]:px-6",
        xl: "h-14 rounded-xl px-10 text-lg has-[>svg]:px-8",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
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
  variant = "default",
  size = "default",
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
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
