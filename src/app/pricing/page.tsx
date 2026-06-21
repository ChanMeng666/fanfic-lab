import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { stackServerApp } from "@/lib/stack";
import { PricingCards } from "@/components/billing/PricingCards";

export const metadata: Metadata = {
  title: "充值 · 积分套餐",
  description:
    "FanFic Lab 积分套餐：1 积分约等于 1000 字。短篇每日免费，充值后可创作更多中长篇与续写。积分永不过期，支持支付宝、微信、信用卡。",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "积分是怎么计算的？",
    a: "1 积分约等于 1000 字。短篇（约 1000 字）每天有免费额度；中篇 3 积分、长篇 5 积分；续写按字数结算（每 1000 字 1 积分，最低 1 积分）。",
  },
  {
    q: "积分会过期吗？",
    a: "不会。充值的积分长期有效，随用随扣。",
  },
  {
    q: "支持哪些支付方式？",
    a: "支持主流信用卡与 Link（由 Stripe 安全处理，我们不接触你的支付信息）。支付宝、微信支付在开通后会自动出现在收银台。",
  },
  {
    q: "可以退款吗？",
    a: "已消耗的积分不支持退款。如遇支付异常或重复扣款，请通过页面底部的联系方式与我们联系。",
  },
];

export default async function PricingPage() {
  const user = await stackServerApp.getUser();
  const isAuthenticated = Boolean(user);

  return (
    <main className="container mx-auto px-4 pt-24 pb-16">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-ai-surface px-3 py-1 text-xs text-accent">
          <Sparkles className="size-3.5" />
          为你的创作充能
        </span>
        <h1 className="font-display text-4xl text-foreground">积分套餐</h1>
        <p className="text-muted-foreground">
          1 积分 ≈ 1000 字。短篇每日免费，充值后即可创作更多中长篇与续写。积分永不过期。
        </p>
      </div>

      {/* Packs */}
      <div className="mx-auto mt-10 max-w-4xl">
        <PricingCards isAuthenticated={isAuthenticated} />
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="font-display text-2xl text-foreground text-center">常见问题</h2>
        <dl className="mt-6 space-y-5">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl border border-border bg-surface p-5">
              <dt className="font-medium text-foreground">{item.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
