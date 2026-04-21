"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center size-20 rounded-3xl bg-destructive/10 text-destructive mx-auto">
          <AlertTriangle className="size-10" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">
            出了点小状况
          </h1>
          <p className="text-sm text-muted-foreground">
            页面加载时发生了错误，可以重试或返回首页继续浏览。
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/70 font-mono">
              错误 ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="gap-1.5">
            <RotateCcw className="size-4" />
            重试
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-1.5">
              <Home className="size-4" />
              回到首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
