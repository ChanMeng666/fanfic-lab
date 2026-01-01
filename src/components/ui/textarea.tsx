import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  // Base styles
  "flex w-full rounded-lg border bg-surface px-4 py-3 text-base transition-all duration-150 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: [
          "border-border shadow-xs",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15",
          "dark:bg-surface/50",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        ],
        // Prose variant for story writing - serif font, generous spacing
        prose: [
          "font-prose border-none bg-transparent shadow-none",
          "text-lg leading-relaxed",
          "focus-visible:ring-0",
          "min-h-[60vh] p-6",
          "resize-none",
        ],
        // Ghost variant - minimal chrome
        ghost: [
          "border-transparent bg-transparent shadow-none",
          "focus-visible:bg-muted/50 focus-visible:ring-0",
        ],
      },
      size: {
        default: "min-h-20 field-sizing-content",
        sm: "min-h-16 text-sm",
        lg: "min-h-32 text-lg",
        auto: "field-sizing-content",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {}

function Textarea({ className, variant, size, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(textareaVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
