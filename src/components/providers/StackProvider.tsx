"use client";

import { StackProvider as StackAuthProvider, StackTheme } from "@stackframe/stack";
import { ThemeProvider } from "next-themes";
import { stackClientApp } from "@/lib/stack-client";

interface StackProviderProps {
  children: React.ReactNode;
}

export function StackProvider({ children }: StackProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <StackAuthProvider app={stackClientApp}>
        <StackTheme>{children}</StackTheme>
      </StackAuthProvider>
    </ThemeProvider>
  );
}
