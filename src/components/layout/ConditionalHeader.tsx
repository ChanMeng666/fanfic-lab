"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

/**
 * Routes whose own hero / background must reach all the way to the top of
 * the viewport. For these routes we render the floating navbar without the
 * 4rem spacer below it, so the page can render flush against the top.
 */
const FULL_BLEED_ROUTES = new Set<string>(["/", "/about"]);

/**
 * Wrapper component that conditionally renders the global header.
 *
 * - Editor routes hide the header entirely because they ship their own
 *   specialised editor toolbar.
 * - Full-bleed routes render the header without the spacer so the page
 *   can take over the very top of the viewport.
 * - All other routes get the header + a 4rem spacer so their content
 *   starts below the floating navbar.
 */
export function ConditionalHeader() {
  const pathname = usePathname();

  if (pathname?.startsWith("/editor")) {
    return null;
  }

  const isFullBleed = FULL_BLEED_ROUTES.has(pathname ?? "");

  return (
    <>
      <Header />
      {!isFullBleed && <div className="h-16 bg-background" aria-hidden />}
    </>
  );
}
