"use client";

import Link from "next/link";
import { Sparkles, Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import {
  CREDIT_PACK_DISPLAY,
  packTotalCredits,
} from "@/lib/billing/packs-display";

interface OutOfCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  /** Optional context line, e.g. "中篇需要 3 积分". */
  reason?: string;
}

/**
 * Shown when a generation is blocked for lack of credits. Offers quick top-up
 * via the popular packs and a link to the full pricing page.
 */
export function OutOfCreditsDialog({
  open,
  onOpenChange,
  isAuthenticated,
  reason,
}: OutOfCreditsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-accent/30 bg-ai-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Coins className="size-4" />
            </span>
            积分不足
          </DialogTitle>
          <DialogDescription>
            {reason ?? "当前积分不足以完成这次创作。充值后即可继续，积分永不过期。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {CREDIT_PACK_DISPLAY.filter((p) => p.popular || p.id === "starter").map(
            (pack) => (
              <div
                key={pack.id}
                className="flex flex-col gap-1 rounded-xl border border-border bg-background p-3"
              >
                <span className="font-display text-base text-foreground">
                  {pack.nameZh}
                </span>
                <span className="text-xs text-muted-foreground">
                  {packTotalCredits(pack).toLocaleString()} 积分 · {pack.displayPrice}
                </span>
                <CheckoutButton
                  packId={pack.id}
                  isAuthenticated={isAuthenticated}
                  variant={pack.popular ? "ai" : "default"}
                  className="mt-1 w-full"
                >
                  <Sparkles className="size-3.5" />
                  充值
                </CheckoutButton>
              </div>
            )
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            稍后再说
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pricing">查看全部套餐</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
