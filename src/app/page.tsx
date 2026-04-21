"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { BookOpen, Feather, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeveloperAttribution, HsrAttribution } from "@/components/layout";

/**
 * Landing page — cinematic, single-screen hero.
 *
 * The background uses the official "Honkai: Star Rail" 3rd Anniversary
 * key visual from the v4.2 press kit. A dark gradient vignette sits on
 * top of the image so the glassmorphism card in the center stays legible,
 * and the page is height-locked to one viewport so there is no scroll.
 *
 * Art © HoYoverse / miHoYo. Used under HoYoverse's Fan Content Policy
 * for this non-commercial fan project. See /about for full attribution.
 */
export default function Home() {
  return (
    <main
      // Fill the viewport below the floating navbar spacer (h-16 = 4rem)
      // and hide any overflow so the hero stays exactly one screen tall.
      className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-background"
    >
      {/* Full-screen key visual background */}
      <Image
        src="/hero/kv-anniversary.jpg"
        alt="Honkai: Star Rail anniversary key visual"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Readability vignette: darker at top/bottom, slightly lighter in the middle */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/70"
      />
      {/* Center radial darkening so the glass card stands out */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 55%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Glassmorphism hero card */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={[
            "w-full max-w-2xl",
            "rounded-3xl",
            "border border-white/15",
            "bg-black/30 backdrop-blur-2xl",
            "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]",
            "px-6 py-10 md:px-12 md:py-14",
            "text-center space-y-6",
          ].join(" ")}
        >
          {/* Brand mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center"
          >
            <div
              className={[
                "flex items-center justify-center",
                "size-14 md:size-16 rounded-2xl",
                "bg-white/10 backdrop-blur-md",
                "border border-white/20",
                "text-white shadow-inner",
              ].join(" ")}
            >
              <Feather className="size-7 md:size-8" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          >
            星穹铁道·梦笔
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="text-lg md:text-2xl text-white/85 font-light drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
          >
            描述你想看的故事，
            <span className="text-amber-300 font-medium">AI为你执笔</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
          >
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
                className={[
                  "gap-2 min-w-[180px]",
                  // Override default outline button so it reads well against
                  // the dark KV: translucent white surface + white text.
                  "bg-white/10 hover:bg-white/20 border-white/30 text-white hover:text-white",
                  "backdrop-blur-md",
                ].join(" ")}
              >
                <BookOpen className="size-5" />
                浏览故事
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Developer (bottom-left) and HSR attribution (bottom-right) pills */}
      <DeveloperAttribution />
      <HsrAttribution />
    </main>
  );
}
