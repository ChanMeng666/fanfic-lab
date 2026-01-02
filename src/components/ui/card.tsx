import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col gap-6 rounded-3xl border shadow-sm transition-all duration-250",
  {
    variants: {
      variant: {
        default: "border-border hover:border-border-strong hover:shadow-md",
        // AI content card - amber accent with glow
        ai: "border-accent/30 bg-ai-surface ai-glow",
        // Story card with accent border on hover
        story: "relative overflow-hidden story-card-accent hover:shadow-lg",
        // Elevated card
        elevated: "border-border shadow-md hover:shadow-lg",
        // Ghost card - minimal
        ghost: "border-transparent shadow-none bg-transparent",
      },
      padding: {
        default: "py-6",
        compact: "py-4",
        spacious: "py-8",
        none: "py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, padding, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-snug font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// AI-specific card for content approval
function AICard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Card
      variant="ai"
      className={cn("animate-ai-reveal", className)}
      {...props}
    />
  )
}

// AI card header with status indicator
function AICardHeader({
  className,
  status = "ready",
  ...props
}: React.ComponentProps<"div"> & {
  status?: "ready" | "thinking" | "complete"
}) {
  return (
    <div
      data-slot="ai-card-header"
      className={cn(
        "flex items-center gap-3 px-6 py-4 border-b border-accent/20 bg-accent-subtle/50",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "size-2 rounded-full",
          status === "ready" && "bg-success",
          status === "thinking" && "bg-accent animate-pulse",
          status === "complete" && "bg-primary"
        )}
      />
      {props.children}
    </div>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  AICard,
  AICardHeader,
  cardVariants,
}
