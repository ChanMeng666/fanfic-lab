"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { checkCanGenerate } from "@/lib/actions/credits";

interface CreditGateProps {
  length: "short" | "medium" | "long";
  children: React.ReactNode;
  onBlocked?: () => void;
}

export function CreditGate({ length, children, onBlocked }: CreditGateProps) {
  const [canGenerate, setCanGenerate] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    checkCanGenerate(length)
      .then((result) => {
        setCanGenerate(result.canGenerate);
        setReason(result.reason || null);
        if (!result.canGenerate) onBlocked?.();
      })
      .catch(() => {
        // Allow generation if credit check fails (graceful degradation)
        setCanGenerate(true);
      });
  }, [length, onBlocked]);

  // Loading state
  if (canGenerate === null) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin size-5 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  // Blocked
  if (!canGenerate) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-6 text-center space-y-3">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{reason}</p>
          <Button variant="outline" className="gap-1.5">
            <Sparkles className="size-4" />
            Get More Credits
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
