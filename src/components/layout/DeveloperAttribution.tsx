"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Github, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeveloperAttribution() {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Close on outside tap / click + ESC for keyboard users.
  // Pure hover would lock out touch devices, so the pill stays open
  // until the user explicitly dismisses it elsewhere on the page.
  useEffect(() => {
    if (!isExpanded) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsExpanded(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isExpanded]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="fixed bottom-6 left-6 z-40"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Floating pill container.
          Not a <button> because it contains <Link>s; using role+key handler
          so screen readers and keyboard users can still toggle it. */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "收起开发者信息" : "展开开发者信息"}
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer",
          "rounded-full bg-surface/85 backdrop-blur-lg",
          "border border-border/50 shadow-lg",
          "transition-all duration-300 ease-out outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isExpanded && "gap-3 px-4 py-2.5"
        )}
      >
        {/* Chan Meng Logo */}
        <div className="flex items-center justify-center size-6 shrink-0">
          <Image
            src="/chan_logo.svg"
            alt="Chan Meng"
            width={24}
            height={24}
            className="size-6 opacity-70"
          />
        </div>

        {/* Name - always visible */}
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Chan Meng
        </span>

        {/* Expanded: Contact links */}
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1 overflow-hidden"
            >
              {/* Divider */}
              <span className="h-4 w-px bg-border/50 mx-1" />

              {/* Email */}
              <Link
                href="mailto:chanmeng.dev@gmail.com"
                title="Email"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Mail className="size-3.5" />
              </Link>

              {/* GitHub Profile */}
              <Link
                href="https://github.com/ChanMeng666"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub Profile"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Github className="size-3.5" />
              </Link>

              {/* Project Repo */}
              <Link
                href="https://github.com/ChanMeng666/fanfic-lab"
                target="_blank"
                rel="noopener noreferrer"
                title="Project Repository"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <ExternalLink className="size-3.5" />
              </Link>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Subtle CTA on hover */}
      <AnimatePresence>
        {isExpanded && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="text-xs text-muted-foreground/60 mt-1.5 ml-1"
          >
            Available for custom projects
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
