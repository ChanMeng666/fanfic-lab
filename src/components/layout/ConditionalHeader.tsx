"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

/**
 * Wrapper component that conditionally renders the global header.
 * Hides the header on editor routes since they have their own specialized header.
 */
export function ConditionalHeader() {
  const pathname = usePathname();

  // Hide header on editor routes (they have their own header)
  if (pathname?.startsWith("/editor")) {
    return null;
  }

  return <Header />;
}
