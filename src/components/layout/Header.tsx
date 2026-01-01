"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@stackframe/stack";
import {
  Feather,
  User,
  Settings,
  LogOut,
  BookOpen,
  FileText,
  PenLine,
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
import { cn } from "@/lib/utils";
import { syncUser } from "@/lib/actions/user";

export function Header({ className }: { className?: string }) {
  const user = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  // Loading state: useUser() returns undefined initially, then user or null
  const isLoading = user === undefined;
  const isLoggedIn = user !== null && user !== undefined;

  // Sync user to database when authenticated
  useEffect(() => {
    if (isLoggedIn && !hasSynced) {
      syncUser()
        .then(() => {
          setHasSynced(true);
        })
        .catch((error) => {
          console.error("Failed to sync user:", error);
        });
    }
  }, [isLoggedIn, hasSynced]);

  const handleSignOut = async () => {
    if (user) {
      await user.signOut();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md",
        className
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Feather className="size-4" />
          </div>
          <span className="text-xl font-display font-semibold text-foreground">
            FanFic Lab
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/feed"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Explore
          </Link>
          <Link
            href="/wizard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Wizard
          </Link>
        </nav>

        {/* Right Side: Auth Section */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            // Loading skeleton
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          ) : isLoggedIn ? (
            // Logged-in state
            <>
              {/* Quick Actions (Desktop) */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/wizard">
                  <Button size="sm" className="gap-1.5">
                    <PenLine className="size-4" />
                    New Story
                  </Button>
                </Link>
              </div>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative size-9 rounded-full p-0"
                  >
                    <Avatar className="size-9 ring-2 ring-border">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
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
                      My Stories
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile?tab=drafts"
                      className="cursor-pointer gap-2"
                    >
                      <FileText className="size-4" />
                      Drafts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/handler/account-settings"
                      className="cursor-pointer gap-2"
                    >
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            // Logged-out state
            <div className="flex items-center gap-3">
              <Link href="/handler/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/wizard">
                <Button size="sm">
                  Get Started
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface p-4">
          <nav className="flex flex-col gap-2">
            <Link
              href="/feed"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore
            </Link>
            <Link
              href="/wizard"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Wizard
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  href="/profile"
                  className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Stories
                </Link>
                <Link
                  href="/profile?tab=drafts"
                  className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Drafts
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
