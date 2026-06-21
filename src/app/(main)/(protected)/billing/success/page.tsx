"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCheckoutStatus } from "@/lib/actions/checkout";

type View = "checking" | "paid" | "timeout";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  // Initial view is derived (not set in an effect) so we never call setState
  // synchronously inside the effect body.
  const [view, setView] = useState<View>(sessionId ? "checking" : "timeout");
  const [balance, setBalance] = useState<number | null>(null);
  const [credited, setCredited] = useState<number>(0);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    cancelled.current = false;

    // Poll until the webhook marks the payment paid, or we give up (~30s). The
    // webhook is the source of truth — this page only confirms the credits landed.
    async function poll(attempt: number) {
      if (cancelled.current) return;
      try {
        const res = await getCheckoutStatus(sessionId!);
        if (res.status === "paid") {
          setBalance(res.balance);
          setCredited(res.creditsGranted);
          setView("paid");
          return;
        }
      } catch {
        // ignore transient errors and keep polling
      }
      if (attempt >= 15) {
        setView("timeout");
        return;
      }
      setTimeout(() => poll(attempt + 1), 2000);
    }

    poll(0);
    return () => {
      cancelled.current = true;
    };
  }, [sessionId]);

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-4">
      <Card variant={view === "paid" ? "ai" : "default"} className="w-full text-center">
        <CardContent className="space-y-4 py-8">
          {view === "checking" && (
            <>
              <Loader2 className="mx-auto size-10 animate-spin text-accent" />
              <h1 className="font-display text-2xl text-foreground">支付处理中…</h1>
              <p className="text-sm text-muted-foreground">
                正在确认你的支付，积分马上到账，请稍候。
              </p>
            </>
          )}

          {view === "paid" && (
            <>
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <h1 className="font-display text-2xl text-foreground">充值成功</h1>
              <p className="text-sm text-muted-foreground">
                已到账 <span className="text-accent font-medium">+{credited}</span> 积分
                {balance !== null && (
                  <>
                    ，当前余额 <span className="text-foreground font-medium">{balance}</span> 积分
                  </>
                )}
                。
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="ai" asChild>
                  <Link href="/create">
                    <Sparkles className="size-4" />
                    继续创作
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/billing">查看明细</Link>
                </Button>
              </div>
            </>
          )}

          {view === "timeout" && (
            <>
              <AlertCircle className="mx-auto size-10 text-muted-foreground" />
              <h1 className="font-display text-2xl text-foreground">仍在确认中</h1>
              <p className="text-sm text-muted-foreground">
                支付可能仍在处理。积分到账后会自动更新，你可以稍后在账单页查看。
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link href="/billing">前往账单页</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
