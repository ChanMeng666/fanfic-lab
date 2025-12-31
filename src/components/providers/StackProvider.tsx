"use client";

import { StackProvider as StackAuthProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "@/lib/stack-client";

interface StackProviderProps {
  children: React.ReactNode;
}

export function StackProvider({ children }: StackProviderProps) {
  return (
    <StackAuthProvider app={stackClientApp}>
      <StackTheme>
        {children}
      </StackTheme>
    </StackAuthProvider>
  );
}
