"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getBalance } from "@/lib/actions/credits";

export function CreditBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    getBalance()
      .then((data) => setBalance(data.balance))
      .catch(() => setBalance(null));
  }, []);

  if (balance === null) return null;

  return (
    <Badge variant="secondary" className="text-xs gap-1">
      <Sparkles className="size-3" />
      {balance} credits
    </Badge>
  );
}
