import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Feather,
  Sparkles,
  BookOpen,
  Github,
  Mail,
  ExternalLink,
  ShieldCheck,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { heroBlurDataURL } from "@/lib/hero-blur";

export const metadata: Metadata = {
  title: "关于 · FanFic Lab",
  description:
    "FanFic Lab 是一个非商业的《崩坏·星穹铁道》同人故事生成器，由 AI Agent 驱动。页面展示项目简介、素材出处与开发者信息。",
};

export default function AboutPage() {
  return (
    <main className="relative min-h-screen w-full bg-background">
      {/* KV hero strip — tall enough to carry the 大片 atmosphere, but
          still leaves clear room for the content below on every viewport. */}
      <div className="relative h-[50vh] min-h-[320px] md:h-[60vh] md:min-h-[420px] w-full overflow-hidden">
        <Image
          src="/hero/kv-anniversary.jpg"
          alt="Honkai: Star Rail anniversary key visual"
          fill
          sizes="100vw"
          placeholder="blur"
          blurDataURL={heroBlurDataURL}
          className="object-cover object-center"
          priority
        />
        {/* Darken the top (so the floating navbar reads) and fade the
            bottom into the page background for a seamless transition. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-background"
        />
        <div className="relative z-10 flex h-full items-end pb-10 md:pb-14 px-4">
          <div className="max-w-3xl mx-auto w-full">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              关于 FanFic Lab
            </h1>
            <p className="mt-3 text-white/85 text-base md:text-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              一个非商业的《崩坏·星穹铁道》同人故事生成器
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14 space-y-10">
        {/* Intro */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
              <Feather className="size-5" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              项目简介
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            FanFic Lab（星穹铁道·梦笔）是一个实验性同人创作工具。用户只需用一句话描述想看的故事，
            AI Agent 会结合预置的《崩坏：星穹铁道》角色与世界观知识，自动完成构思、角色分配、
            情节展开与 OOC 检测，最终交付一篇成品同人文。
          </p>
          <p className="text-muted-foreground leading-relaxed">
            本项目完全开源、非商业、公益性质，遵循 miHoYo / HoYoverse 的
            <Link
              href="https://www.hoyolab.com/article/129189"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline mx-1 inline-flex items-center gap-1"
            >
              同人内容政策
              <ExternalLink className="size-3" />
            </Link>
            进行创作与发布。
          </p>
        </section>

        {/* Fan Content Attribution */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-accent/15 text-accent">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              版权与署名
            </h2>
          </div>

          <Card className="border-accent/30 bg-ai-surface">
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-border">
                  <Image
                    src="/brand-marks/hsr-logo.png"
                    alt="Honkai: Star Rail"
                    width={120}
                    height={60}
                    className="h-12 md:h-14 w-auto object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-lg md:text-xl font-semibold text-foreground">
                    Themed for 崩坏·星穹铁道
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Honkai: Star Rail © COGNOSPHERE. All rights reserved.
                    <br />
                    游戏、角色、剧情与全部官方美术资产均属于米哈游 / HoYoverse。
                    FanFic Lab 与米哈游 / HoYoverse 无任何从属或授权关系。
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-2 border-t border-border pt-5">
                <p className="font-medium text-foreground">素材使用声明：</p>
                <ul className="list-disc list-inside space-y-1.5 marker:text-accent">
                  <li>
                    首页 Key Visual 与角色立绘来自 HoYoverse 官方发布的{" "}
                    <span className="font-medium text-foreground">
                      Honkai: Star Rail v4.2 Media Kit
                    </span>{" "}
                    新闻媒体包。
                  </li>
                  <li>
                    使用目的仅限于本非商业同人项目的界面装饰与主题氛围营造，不用于任何形式的商业变现、NFT 或商标注册。
                  </li>
                  <li>
                    若版权方希望本项目下架或调整任何素材，请通过下方联系方式告知，我们将第一时间响应。
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Asset inventory */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
              <Palette className="size-5" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              素材清单
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <dl className="divide-y divide-border text-sm">
                {[
                  {
                    label: "首页 Key Visual",
                    value: "星穹铁道 3 周年 KV（极光群像）",
                  },
                  { label: "LOGO 角标", value: "崩坏·星穹铁道 官方中文 Logo" },
                  {
                    label: "角色立绘（8 张）",
                    value:
                      "卡芙卡、知更鸟、黄泉、银狼、黑天鹅、镜流、刃、阮·梅",
                  },
                  {
                    label: "来源",
                    value: "HoYoverse Honkai: Star Rail v4.2 Media Kit",
                  },
                  {
                    label: "格式",
                    value: "JPG / WebP / PNG（均经 Next.js Image 自动优化）",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-2 px-5 py-3"
                  >
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </section>

        {/* Developer */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              开发者
            </h2>
          </div>
          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <Image
                    src="/chan_logo.svg"
                    alt="Chan Meng"
                    width={48}
                    height={48}
                    className="size-12 opacity-80"
                  />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">
                    Chan Meng
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Full-stack engineer · Available for custom projects
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="mailto:chanmeng.dev@gmail.com"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-surface hover:bg-secondary/50 text-sm text-foreground transition-colors"
                >
                  <Mail className="size-4" />
                  Email
                </Link>
                <Link
                  href="https://github.com/ChanMeng666"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-surface hover:bg-secondary/50 text-sm text-foreground transition-colors"
                >
                  <Github className="size-4" />
                  GitHub
                </Link>
                <Link
                  href="https://github.com/ChanMeng666/fanfic-lab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-surface hover:bg-secondary/50 text-sm text-foreground transition-colors"
                >
                  <ExternalLink className="size-4" />
                  本项目仓库
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA back to product */}
        <section className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/create">
            <Button size="lg" className="gap-2 min-w-[180px] shadow-lg">
              <Sparkles className="size-5" />
              开始创作
            </Button>
          </Link>
          <Link href="/feed">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 min-w-[180px] bg-surface/50 backdrop-blur-sm"
            >
              <BookOpen className="size-5" />
              浏览故事
            </Button>
          </Link>
        </section>
      </div>
    </main>
  );
}
