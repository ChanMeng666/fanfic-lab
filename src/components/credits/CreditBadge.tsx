"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getBalance } from "@/lib/actions/credits";
import { cn } from "@/lib/utils";

/** Compact credit balance pill in the header. Links to the billing page. */
export function CreditBadge({ className }: { className?: string }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    getBalance()
      .then((data) => setBalance(data.balance))
      .catch(() => setBalance(null));
  }, []);

  if (balance === null) return null;

  return (
    <Link
      href="/billing"
      title="积分 & 充值"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border border-accent/30 bg-ai-surface px-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10",
        className
      )}
    >
      <Sparkles className="size-3.5" />
      {balance.toLocaleString()}
    </Link>
  );
}
