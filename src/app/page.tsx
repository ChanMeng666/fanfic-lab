"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { DeveloperAttribution, HsrAttribution } from "@/components/layout";

/**
 * Landing page — minimal, cinematic, single-screen.
 *
 * The entire viewport is taken over by the official Honkai: Star Rail 3rd
 * anniversary key visual. Text and CTAs sit directly on top of the image
 * with a gradient + radial vignette behind them for legibility — no glass
 * card, no brand chip, no icon clutter.
 *
 * Art © HoYoverse / miHoYo. Used under HoYoverse's Fan Content Policy
 * for this non-commercial fan project. See /about for full attribution.
 */
export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      {/* Full-screen key visual background */}
      <Image
        src="/hero/kv-anniversary.jpg"
        alt="Honkai: Star Rail anniversary key visual"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Readability overlays */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/65"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Centered text + CTAs, directly on the KV */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl space-y-6 md:space-y-8"
        >
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          >
            星穹铁道·梦笔
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-lg md:text-2xl text-white/85 font-light drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
          >
            描述你想看的故事，
            <span className="text-amber-300 font-medium">AI为你执笔</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
          >
            <Link href="/create">
              <Button size="lg" className="min-w-[180px] shadow-lg">
                开始创作
              </Button>
            </Link>
            <Link href="/feed">
              <Button
                size="lg"
                variant="outline"
                className={[
                  "min-w-[180px]",
                  // Overrides so the outline button reads well against the dark KV.
                  "bg-white/10 hover:bg-white/20 border-white/30 text-white hover:text-white",
                  "backdrop-blur-md",
                ].join(" ")}
              >
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
