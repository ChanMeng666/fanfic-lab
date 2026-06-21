"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/actions/checkout";
import { formatError } from "@/lib/format-error";
import { cn } from "@/lib/utils";

interface CheckoutButtonProps {
  packId: string;
  /** When false, the button routes to sign-in instead of starting checkout. */
  isAuthenticated: boolean;
  variant?: "ai" | "default" | "outline";
  className?: string;
  children: React.ReactNode;
}

/**
 * Starts a Stripe Checkout Session for a credit pack and redirects the browser
 * to Stripe's hosted page. Unauthenticated users are sent to sign-in first.
 */
export function CheckoutButton({
  packId,
  isAuthenticated,
  variant = "ai",
  className,
  children,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!isAuthenticated) {
      window.location.href = "/handler/sign-in?after_auth_return_to=/pricing";
      return;
    }
    setLoading(true);
    try {
      const { url } = await createCheckoutSession(packId);
      window.location.href = url;
    } catch (err) {
      toast.error(formatError(err, "无法发起支付，请稍后再试"));
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      className={cn("gap-1.5", className)}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          正在跳转…
        </>
      ) : (
        children
      )}
    </Button>
  );
}
