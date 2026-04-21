"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Fixed bottom-right pill that credits Honkai: Star Rail as the source of
 * the world/character assets used by this fan project. Mirrors the layout
 * and interaction of `DeveloperAttribution` (which sits in the bottom-left)
 * so the two appear as a symmetric pair on top of the hero.
 *
 * Clicking the pill opens the dedicated `/about` page for full credit and
 * HoYoverse Fan Content Policy attribution.
 */
export function HsrAttribution({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className={cn("fixed bottom-6 right-6 z-40", className)}
    >
      <Link
        href="/about"
        title="About · Honkai: Star Rail fan content credit"
        className={cn(
          "group flex items-center gap-2 px-3 py-2",
          "rounded-full bg-black/40 backdrop-blur-lg",
          "border border-white/15 shadow-lg",
          "text-white/90 hover:text-white",
          "transition-all duration-300 ease-out",
          "hover:bg-black/55 hover:border-white/25"
        )}
      >
        {/* Subtle HSR logo mark on a clean chip so it reads over any backdrop */}
        <div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-white/90 p-0.5">
          <Image
            src="/brand-marks/hsr-logo.png"
            alt="Honkai: Star Rail"
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        </div>

        <span className="text-xs font-medium whitespace-nowrap">
          Themed for{" "}
          <span className="font-display font-semibold">崩坏·星穹铁道</span>
        </span>
      </Link>
    </motion.div>
  );
}
