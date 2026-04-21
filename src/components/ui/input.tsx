import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "h-10 w-full min-w-0 rounded-full border bg-surface px-4 py-2 text-base transition-all duration-150 outline-none",
        // Border and shadow
        "border-border shadow-xs",
        // Placeholder
        "placeholder:text-muted-foreground",
        // Selection
        "selection:bg-primary selection:text-primary-foreground",
        // Focus state - Teal ring
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50",
        // Dark mode
        "dark:bg-surface/50",
        // File input
        "file:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Responsive
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
