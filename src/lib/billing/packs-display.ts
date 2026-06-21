// Client-safe credit pack metadata. NO process.env references here, so this is
// safe to import from client components (pricing cards, out-of-credits dialog).
// The server-only price IDs live in packs.ts, which extends this data.
//
// Credit model (see lib/billing/pricing.ts): 1 credit ≈ 1000 words.

export interface CreditPackDisplay {
  id: string;
  /** Display name (Chinese) */
  nameZh: string;
  /** Base credits granted */
  credits: number;
  /** Bonus credits on top of base (marketing) */
  bonus: number;
  /** Cosmetic price string shown in the UI */
  displayPrice: string;
  /** One-line value proposition */
  taglineZh: string;
  /** Highlight as the recommended pack */
  popular?: boolean;
}

export const CREDIT_PACK_DISPLAY: CreditPackDisplay[] = [
  {
    id: "starter",
    nameZh: "入门包",
    credits: 50,
    bonus: 0,
    displayPrice: "$1.99",
    taglineZh: "约 5 万字 · 轻度尝鲜",
  },
  {
    id: "standard",
    nameZh: "标准包",
    credits: 200,
    bonus: 20,
    displayPrice: "$5.99",
    taglineZh: "约 22 万字 · 最受欢迎",
    popular: true,
  },
  {
    id: "creator",
    nameZh: "创作者包",
    credits: 550,
    bonus: 0,
    displayPrice: "$12.99",
    taglineZh: "约 55 万字 · 超值之选",
  },
];

/** Total credits a pack grants (base + bonus). */
export function packTotalCredits(pack: CreditPackDisplay): number {
  return pack.credits + pack.bonus;
}
