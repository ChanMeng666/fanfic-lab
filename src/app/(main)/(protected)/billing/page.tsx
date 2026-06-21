import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles, Coins, Receipt, History } from "lucide-react";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PricingCards } from "@/components/billing/PricingCards";
import { getDailyUsage } from "@/lib/actions/credits";

export const metadata: Metadata = {
  title: "积分 & 充值",
};

/** Deterministic YYYY-MM-DD to avoid server/client locale hydration drift. */
function fmtDate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

function fmtMoney(amount: number, currency: string): string {
  const value = (amount / 100).toFixed(2);
  return currency.toLowerCase() === "cny" ? `¥${value}` : `${currency.toUpperCase()} ${value}`;
}

const PAYMENT_STATUS: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  paid: { label: "已支付", variant: "secondary" },
  pending: { label: "待支付", variant: "outline" },
  failed: { label: "失败", variant: "destructive" },
};

export default async function BillingPage() {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) redirect("/handler/sign-in");

  let dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
    select: { id: true },
  });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        stackAuthId: stackUser.id,
        email: stackUser.primaryEmail || `${stackUser.id}@fanficlab.local`,
        username:
          stackUser.displayName?.toLowerCase().replace(/\s+/g, "_") ||
          `user_${stackUser.id.slice(0, 8)}`,
        displayName: stackUser.displayName,
        avatarUrl: stackUser.profileImageUrl,
        preferences: { create: {} },
      },
      select: { id: true },
    });
  }

  const [credits, usage, payments, generations] = await Promise.all([
    prisma.userCredits.findUnique({ where: { userId: dbUser.id } }),
    getDailyUsage(),
    prisma.payment.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.generation.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        wordCount: true,
        creditsCharged: true,
        createdAt: true,
      },
    }),
  ]);

  const balance = credits?.balance ?? 0;
  const totalUsed = credits?.totalUsed ?? 0;

  return (
    <main className="container mx-auto max-w-4xl px-4 pt-24 pb-16">
      <h1 className="font-display text-3xl text-foreground">积分 &amp; 充值</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        1 积分 ≈ 1000 字 · 积分永不过期
      </p>

      {/* Balance + usage */}
      <div className="mt-6 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <Card variant="ai" className="justify-center">
          <CardContent className="flex items-center gap-4 py-2">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Sparkles className="size-6" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">当前余额</p>
              <p className="font-display text-4xl text-foreground leading-none">
                {balance.toLocaleString()}
                <span className="ml-1 text-base text-muted-foreground">积分</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 py-2 text-center">
            <div>
              <p className="font-display text-2xl text-foreground">
                {usage.freeRemaining}/{usage.freeLimit}
              </p>
              <p className="text-xs text-muted-foreground">今日免费短篇剩余</p>
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">
                {totalUsed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">累计消耗积分</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recharge" className="mt-8 gap-4">
        <TabsList>
          <TabsTrigger value="recharge">
            <Coins className="size-4" />
            充值
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="size-4" />
            充值记录
          </TabsTrigger>
          <TabsTrigger value="usage">
            <History className="size-4" />
            消费记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recharge">
          <PricingCards isAuthenticated compact />
        </TabsContent>

        <TabsContent value="payments">
          {payments.length === 0 ? (
            <EmptyState text="还没有充值记录" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <Th>日期</Th>
                    <Th>套餐</Th>
                    <Th>金额</Th>
                    <Th>积分</Th>
                    <Th>状态</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const status = PAYMENT_STATUS[p.status] ?? {
                      label: p.status,
                      variant: "outline" as const,
                    };
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <Td>{fmtDate(p.createdAt)}</Td>
                        <Td>{p.packId}</Td>
                        <Td>{fmtMoney(p.amount, p.currency)}</Td>
                        <Td>+{p.creditsGranted}</Td>
                        <Td>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="usage">
          {generations.length === 0 ? (
            <EmptyState text="还没有创作消费记录" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <Th>日期</Th>
                    <Th>类型</Th>
                    <Th>字数</Th>
                    <Th>消耗积分</Th>
                  </tr>
                </thead>
                <tbody>
                  {generations.map((g) => (
                    <tr key={g.id} className="border-t border-border">
                      <Td>{fmtDate(g.createdAt)}</Td>
                      <Td>{g.type === "STORY" ? "创作" : "续写"}</Td>
                      <Td>{g.wordCount.toLocaleString()}</Td>
                      <Td>{g.creditsCharged === 0 ? "免费" : `-${g.creditsCharged}`}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-foreground">{children}</td>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
