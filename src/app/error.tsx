"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RotateCcw,
  Home,
  ShieldOff,
  SearchX,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

type Variant = "auth" | "forbidden" | "not-found" | "generic";

function classify(message: string): Variant {
  if (/unauthori[sz]ed|未登录|sign[\s-]?in|not authenticated/i.test(message)) {
    return "auth";
  }
  if (/forbidden|无权限|permission denied|not allowed/i.test(message)) {
    return "forbidden";
  }
  if (/not\s?found|不存在|404/i.test(message)) {
    return "not-found";
  }
  return "generic";
}

const COPY: Record<
  Variant,
  {
    icon: typeof AlertTriangle;
    iconBg: string;
    title: string;
    description: string;
  }
> = {
  auth: {
    icon: LogIn,
    iconBg: "bg-primary/10 text-primary",
    title: "请先登录",
    description: "这个操作需要登录后才能继续。",
  },
  forbidden: {
    icon: ShieldOff,
    iconBg: "bg-destructive/10 text-destructive",
    title: "无权限访问",
    description: "你没有访问此内容的权限。",
  },
  "not-found": {
    icon: SearchX,
    iconBg: "bg-secondary text-muted-foreground",
    title: "内容不存在",
    description: "你访问的资源已被移除或从未存在。",
  },
  generic: {
    icon: AlertTriangle,
    iconBg: "bg-destructive/10 text-destructive",
    title: "出了点小状况",
    description: "页面加载时发生了错误，可以重试或返回首页继续浏览。",
  },
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  const variant = classify(error.message ?? "");
  const { icon: Icon, iconBg, title, description } = COPY[variant];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className={`flex items-center justify-center size-20 rounded-3xl mx-auto ${iconBg}`}
        >
          <Icon className="size-10" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/70 font-mono">
              错误 ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {variant === "auth" ? (
            <Link href="/handler/sign-in">
              <Button className="gap-1.5">
                <LogIn className="size-4" />
                去登录
              </Button>
            </Link>
          ) : variant === "not-found" ? (
            <Link href="/feed">
              <Button className="gap-1.5">
                <Home className="size-4" />
                浏览故事
              </Button>
            </Link>
          ) : (
            <Button onClick={reset} className="gap-1.5">
              <RotateCcw className="size-4" />
              重试
            </Button>
          )}
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
