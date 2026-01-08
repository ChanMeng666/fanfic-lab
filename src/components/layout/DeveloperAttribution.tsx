"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Github, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeveloperAttribution() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle tap to toggle on mobile
  const handleClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="fixed bottom-6 left-6 z-40"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Floating pill container */}
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer",
          "rounded-full bg-surface/85 backdrop-blur-lg",
          "border border-border/50 shadow-lg",
          "transition-all duration-300 ease-out",
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
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1 overflow-hidden"
            >
              {/* Divider */}
              <div className="h-4 w-px bg-border/50 mx-1" />

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
            </motion.div>
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
