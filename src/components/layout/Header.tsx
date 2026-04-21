"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@stackframe/stack";
import {
  Settings,
  LogOut,
  BookOpen,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FloatingNavbar, NavLink, NavDivider } from "@/components/ui/floating-navbar";
import { syncUser } from "@/lib/actions/user";

export function Header({ className }: { className?: string }) {
  const user = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  const isLoading = user === undefined;
  const isLoggedIn = user !== null && user !== undefined;

  // Sync user to database when authenticated
  useEffect(() => {
    if (isLoggedIn && !hasSynced) {
      syncUser()
        .then(() => setHasSynced(true))
        .catch((error) => console.error("Failed to sync user:", error));
    }
  }, [isLoggedIn, hasSynced]);

  const handleSignOut = async () => {
    if (user) {
      await user.signOut();
    }
  };

  return (
    <>
      <FloatingNavbar className={className}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group px-1">
          <div className="flex items-center justify-center size-7 rounded-xl overflow-hidden transition-transform group-hover:scale-105">
            <Image
              src="/logo/fanfic-lab-logo.svg"
              alt="FanFic Lab"
              width={28}
              height={28}
              className="size-7"
              priority
            />
          </div>
          <span className="text-base font-display font-semibold text-foreground hidden sm:inline">
            FanFic Lab
          </span>
        </Link>

        {/* Divider */}
        <NavDivider className="hidden sm:block" />

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center">
          <NavLink href="/create">创作</NavLink>
          <NavLink href="/feed">发现</NavLink>
          <NavLink href="/profile">我的</NavLink>
          <NavLink href="/about">关于</NavLink>
        </nav>

        {/* Divider before auth */}
        <NavDivider />

        {/* Auth Section */}
        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <Skeleton className="size-8 rounded-full" />
          ) : isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative size-8 rounded-full p-0 hover:bg-transparent"
                >
                  <Avatar className="size-8 ring-2 ring-border/50 hover:ring-primary/50 transition-all">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user.displayName?.[0]?.toUpperCase() ||
                        user.primaryEmail?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {user.displayName || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.primaryEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer gap-2">
                    <BookOpen className="size-4" />
                    我的作品
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/handler/account-settings" className="cursor-pointer gap-2">
                    <Settings className="size-4" />
                    设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/handler/sign-in" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-sm rounded-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/create">
                <Button size="sm" className="h-8 px-3 text-sm rounded-full gap-1">
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Start</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden size-8 rounded-full"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </Button>
        </div>
      </FloatingNavbar>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-16 inset-x-0 mx-auto max-w-[280px] z-40 sm:hidden">
          <div className="bg-surface/95 backdrop-blur-lg border border-border/50 rounded-2xl shadow-lg p-2 animate-fade-slide-in">
            <nav className="flex flex-col gap-1">
              <Link
                href="/create"
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                创作
              </Link>
              <Link
                href="/feed"
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                发现
              </Link>
              <Link
                href="/about"
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                关于
              </Link>
              {isLoggedIn && (
                <>
                  <div className="h-px bg-border/50 my-1" />
                  <Link
                    href="/profile"
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    我的作品
                  </Link>
                </>
              )}
              {!isLoggedIn && (
                <>
                  <div className="h-px bg-border/50 my-1" />
                  <Link
                    href="/handler/sign-in"
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    登录
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

    </>
  );
}
