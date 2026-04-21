"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, stagger, useAnimate } from "motion/react";
import { BookOpen, Feather, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { DeveloperAttribution } from "@/components/layout";

/**
 * Honkai: Star Rail character splash arts.
 *
 * Source: Official artwork © HoYoverse / miHoYo, from the official
 * "Honkai: Star Rail 4.2 Media Kit" press release bundle. Used under
 * HoYoverse's Fan Content Policy for this non-commercial fan project.
 *
 * Files live in `public/hero/hsr/` so Next.js can serve responsive,
 * optimized variants (AVIF / WebP at the exact rendered size).
 */
const floatingImages = [
  {
    // 卡芙卡 Kafka — 星核猎手，小提琴
    url: "/hero/hsr/kafka.webp",
    alt: "卡芙卡 Kafka",
    className: "top-[8%] left-[5%] md:left-[11%]",
    size: "w-20 h-28 md:w-28 md:h-40",
    depth: 0.5,
  },
  {
    // 知更鸟 Robin — 和谐歌姬
    url: "/hero/hsr/robin.webp",
    alt: "知更鸟 Robin",
    className: "top-[5%] left-[60%] md:left-[68%]",
    size: "w-24 h-24 md:w-32 md:h-32",
    depth: 1,
  },
  {
    // 黄泉 Acheron — 雷电自我湮灭者
    url: "/hero/hsr/acheron.webp",
    alt: "黄泉 Acheron",
    className: "top-[2%] left-[30%] md:left-[38%]",
    size: "w-20 h-28 md:w-28 md:h-36",
    depth: 2,
  },
  {
    // 银狼 Silver Wolf — 以太黑客
    url: "/hero/hsr/silver-wolf.webp",
    alt: "银狼 Silver Wolf",
    className: "top-[45%] left-[2%] md:left-[5%]",
    size: "w-24 h-28 md:w-32 md:h-36",
    depth: 1.5,
  },
  {
    // 黑天鹅 Black Swan — 记忆神秘学者
    url: "/hero/hsr/black-swan.webp",
    alt: "黑天鹅 Black Swan",
    className: "top-[55%] md:top-[50%] left-[75%] md:left-[82%]",
    size: "w-20 h-24 md:w-28 md:h-32",
    depth: 2.5,
  },
  {
    // 镜流 Jingliu — 月隐剑客
    url: "/hero/hsr/jingliu.webp",
    alt: "镜流 Jingliu",
    className: "top-[75%] md:top-[72%] left-[8%] md:left-[15%]",
    size: "w-24 h-24 md:w-32 md:h-32",
    depth: 3,
  },
  {
    // 刃 Blade — 星核猎手
    url: "/hero/hsr/blade.webp",
    alt: "刃 Blade",
    className: "top-[78%] md:top-[75%] left-[55%] md:left-[60%]",
    size: "w-20 h-24 md:w-28 md:h-32",
    depth: 1,
  },
  {
    // 阮·梅 Ruan Mei — 天才俱乐部
    url: "/hero/hsr/ruan-mei.webp",
    alt: "阮·梅 Ruan Mei",
    className: "top-[25%] left-[80%] md:left-[88%]",
    size: "w-20 h-28 md:w-24 md:h-32",
    depth: 4,
  },
];

export default function Home() {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      ".floating-image",
      { opacity: [0, 1], scale: [0.8, 1] },
      { duration: 0.5, delay: stagger(0.12) }
    );
  }, [animate]);

  return (
    <main
      ref={scope}
      // Fill the viewport below the floating navbar spacer (h-16 = 4rem).
      // Using a fixed height + overflow-hidden ensures the hero occupies
      // exactly one screen at every breakpoint with no vertical scroll.
      className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-background"
    >
      {/* Hero section */}
      <div className="relative h-full w-full overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        {/* Floating Honkai: Star Rail character splash arts */}
        <Floating sensitivity={-0.5} className="overflow-hidden z-0">
          {floatingImages.map((image, index) => (
            <FloatingElement
              key={index}
              depth={image.depth}
              className={image.className}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                className="floating-image"
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={400}
                  height={560}
                  sizes="(max-width: 768px) 128px, 176px"
                  className={`${image.size} object-cover rounded-2xl shadow-xl hover:scale-105 duration-300 cursor-pointer transition-transform ring-1 ring-border/50`}
                  priority={index < 4}
                />
              </motion.div>
            </FloatingElement>
          ))}
        </Floating>

        {/* Centered hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
          <motion.div
            className="text-center space-y-6 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            {/* Logo and brand */}
            <div className="flex items-center justify-center">
              <div className="flex items-center justify-center size-14 md:size-16 rounded-2xl bg-primary/10 text-primary">
                <Feather className="size-7 md:size-8" />
              </div>
            </div>

            {/* Main headline */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground">
              星穹铁道·梦笔
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              描述你想看的故事，
              <span className="text-accent font-medium">AI为你执笔</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
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
            </div>
          </motion.div>
        </div>
      </div>

      {/* Developer Attribution */}
      <DeveloperAttribution />
    </main>
  );
}
