"use client";

import * as React from "react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const transition = {
  type: "spring" as const,
  mass: 0.5,
  damping: 15,
  stiffness: 120,
  restDelta: 0.001,
  restSpeed: 0.001,
};

interface FloatingNavbarProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingNavbar({ children, className }: FloatingNavbarProps) {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={transition}
      className={cn(
        "fixed top-4 inset-x-0 max-w-fit mx-auto z-50",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5",
          "rounded-full bg-surface/85 backdrop-blur-lg",
          "border border-border/50 shadow-lg",
          "dark:bg-surface/80 dark:border-border/30"
        )}
      >
        {children}
      </div>
    </motion.nav>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
        isActive
          ? "text-foreground bg-secondary/70"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
        className
      )}
    >
      {children}
    </a>
  );
}

interface NavDividerProps {
  className?: string;
}

export function NavDivider({ className }: NavDividerProps) {
  return (
    <div
      className={cn(
        "h-5 w-px bg-border/50 mx-1 sm:mx-2",
        className
      )}
    />
  );
}
