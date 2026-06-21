"use client";

import { Sparkles, Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import {
  CREDIT_PACK_DISPLAY,
  packTotalCredits,
} from "@/lib/billing/packs-display";
import { cn } from "@/lib/utils";

interface PricingCardsProps {
  isAuthenticated: boolean;
  /** Compact layout for the billing dashboard tab. */
  compact?: boolean;
}

export function PricingCards({ isAuthenticated, compact }: PricingCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CREDIT_PACK_DISPLAY.map((pack) => {
        const total = packTotalCredits(pack);
        const highlight = pack.popular;
        return (
          <Card
            key={pack.id}
            variant={highlight ? "ai" : "default"}
            className={cn(
              "relative flex flex-col",
              highlight && "ring-1 ring-accent/40",
              compact && "gap-3"
            )}
          >
            {highlight && (
              <Badge
                variant="secondary"
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 text-xs"
              >
                <Sparkles className="size-3" />
                最受欢迎
              </Badge>
            )}
            <CardHeader className={cn("pb-0", compact && "pt-1")}>
              <span className="font-display text-lg text-foreground">
                {pack.nameZh}
              </span>
              <span className="text-xs text-muted-foreground">
                {pack.taglineZh}
              </span>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "font-display text-3xl",
                    highlight ? "text-accent" : "text-foreground"
                  )}
                >
                  {total.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">积分</span>
              </div>
              {pack.bonus > 0 && (
                <span className="text-xs text-success">
                  含赠送 {pack.bonus} 积分
                </span>
              )}
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl text-foreground">
                  {pack.displayPrice}
                </span>
                <span className="text-xs text-muted-foreground">一次性</span>
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />约 {total * 1000 / 10000} 万字
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />积分永不过期
                </li>
              </ul>
              <div className="mt-auto pt-2">
                <CheckoutButton
                  packId={pack.id}
                  isAuthenticated={isAuthenticated}
                  variant={highlight ? "ai" : "default"}
                  className="w-full"
                >
                  <Sparkles className="size-4" />
                  立即充值
                </CheckoutButton>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
