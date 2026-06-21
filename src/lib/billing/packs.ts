// Server-side credit pack catalog — the SINGLE SOURCE OF TRUTH for how money
// turns into credits. Extends the client-safe display metadata with Stripe
// Price IDs (env-specific: test vs live). The webhook derives credits-to-grant
// from `packId` via this catalog — never from client input.

import {
  CREDIT_PACK_DISPLAY,
  packTotalCredits,
  type CreditPackDisplay,
} from "./packs-display";

export type { CreditPackDisplay };

export interface CreditPack extends CreditPackDisplay {
  /** Stripe Price id for this pack (configured per environment via env). */
  priceId: string;
}

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? "",
  standard: process.env.STRIPE_PRICE_STANDARD ?? "",
  creator: process.env.STRIPE_PRICE_CREATOR ?? "",
};

export const CREDIT_PACKS: CreditPack[] = CREDIT_PACK_DISPLAY.map((p) => ({
  ...p,
  priceId: PRICE_IDS[p.id] ?? "",
}));

/** Total credits a pack grants (base + bonus). */
export function totalCredits(pack: CreditPackDisplay): number {
  return packTotalCredits(pack);
}

/** Look up a pack (with its price id) by id. */
export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
